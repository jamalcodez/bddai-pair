# Context Engineering Quick Start Guide

## TL;DR - Key Concepts

### Current Problem
Your agents currently do this:
```typescript
// ❌ Context grows unbounded
context = { ...context, newData }
context = { ...context, moreData }
context = { ...context, evenMoreData }
// Eventually: Out of memory or token limits exceeded
```

### ADK Solution
ADK does this instead:
```typescript
// ✅ Context is compiled on-demand from structured sources
const context = compiler.compile({
  session: durableSessionState,    // What happened in this conversation
  memory: crossSessionMemory,      // What we learned before
  artifacts: largeDataRegistry     // Files, logs, etc. (by reference)
})
// Result: Optimized, relevant context that fits token budget
```

---

## Before & After Comparison

### Before (Current bddai-pair)

```typescript
// PairSession maintains one giant context object
class PairSession {
  context = {
    sessionId: '123',
    turn: 0,
    driverTurns: 0,
    navigatorTurns: 0,
    // ... and it keeps growing
    message1: {...},
    message2: {...},
    message3: {...},
    // ... all 100 messages inline
    codeFile1: "entire file contents...",
    codeFile2: "entire file contents...",
    // ... token limit exceeded!
  }
}
```

**Problems:**
- Context grows without bound
- No way to compress or summarize old data
- Large files bloat the context
- No memory across sessions
- Agents can't learn from past mistakes

### After (With Context Engineering)

```typescript
// Separate sources (durable state)
const sessionState = {
  id: '123',
  turn: 45,
  agents: [...],
  messages: [...],  // All 100 messages stored here
  metadata: {...}
}

const memory = {
  // Learnings from past sessions
  "pattern:authentication": { success_rate: 0.95, best_practices: [...] },
  "decision:error_handling": { reasoning: "...", chosen_pattern: "Result<T>" }
}

const artifacts = {
  // Large files by reference
  "src/auth/login.ts": { id: "artifact-1", version: 3, summary: "Login controller..." },
  "test/auth.spec.ts": { id: "artifact-2", version: 1, summary: "Auth tests..." }
}

// Compiled context (optimized view for LLM)
const compiledContext = {
  scenario: { name: "User Login", currentStep: 3 },
  recentMessages: messages.slice(-10),  // Only last 10
  messageSummary: "Earlier: discussed auth flow, decided on JWT",
  relevantMemory: ["pattern:authentication"],
  artifacts: [
    { id: "artifact-1", name: "login.ts", summary: "Login controller..." }
    // Not the full file, just metadata
  ],
  artifactLoader: async (id) => { /* load on demand */ }
}
```

**Benefits:**
- Context stays small and focused
- Can include 100s of messages (summarized)
- Files referenced, not inlined
- Agents learn across sessions
- Fits within token budgets

---

## Practical Examples

### Example 1: Message History Management

**Problem**: After 50 messages, context is huge and mostly irrelevant.

**Solution**: Message History Processor

```typescript
class MessageHistoryProcessor {
  async process(context: any, sources: ContextSource) {
    const messages = sources.session.messages

    // Split into recent and old
    const recent = messages.slice(-10)   // Keep last 10 full
    const old = messages.slice(0, -10)   // Summarize the rest

    context.recentMessages = recent
    context.conversationSummary = this.summarize(old)
    // "Driver proposed MVC architecture. Navigator implemented controllers
    //  and services. 3 bugs fixed. Tests passing."

    return context
  }
}
```

**Result**: Context includes 10 full messages + summary, instead of 50 full messages.

### Example 2: Code Artifact Management

**Problem**: Including entire source files in context exhausts tokens.

**Solution**: Artifact Registry + Smart Loading

```typescript
// Register artifacts
await artifacts.register({
  name: 'src/auth/LoginController.ts',
  type: 'code',
  path: '/path/to/file',
  summary: 'Handles user login, validates credentials, generates JWT tokens',
  contentUri: 'file://...'
})

// In context, only include metadata
context.artifacts = [{
  id: 'artifact-1',
  name: 'LoginController.ts',
  summary: 'Handles user login...'
}]

// Agent can request full content if needed
if (needsFullCode) {
  const content = await context.artifactLoader('artifact-1')
}
```

**Result**:
- **Before**: 500 lines of code in context = ~1500 tokens
- **After**: Summary only = ~50 tokens (30x reduction)
- Full content loaded on-demand only when actually needed

### Example 3: Cross-Session Learning

**Problem**: Agent makes the same mistake every session.

**Solution**: Memory System

```typescript
// Session 1: Agent makes mistake
await memory.store({
  key: 'mistake:forgot_error_handling',
  value: {
    description: 'Forgot to wrap async calls in try-catch',
    impact: 'Runtime crash',
    solution: 'Always use try-catch for async operations',
    frequency: 1
  },
  source: 'agent',
  sessionId: 'session-1',
  relevance: 1.0,
  tags: ['mistake', 'error-handling']
})

// Session 2: Before agent codes, check memory
const pastMistakes = await memory.recall({
  tags: ['mistake'],
  minRelevance: 0.5
})

context.learnings = pastMistakes.map(m => m.value)
// Agent sees: "Remember: Always use try-catch for async operations"

// Session 2: Agent includes error handling ✅
```

**Result**: Agent learns from experience and improves over time.

### Example 4: Context Budget Management

**Problem**: Context exceeds token limit, LLM call fails.

**Solution**: Budget Manager with Priorities

```typescript
const budget = new ContextBudgetManager({ maxTokens: 4000 })

// Before sending to LLM
const compiledContext = await compiler.compile(sources)

if (compiledContext.tokenCount > 4000) {
  // Intelligently truncate by priority
  const fitted = await budget.fitToBudget(compiledContext)
  // Keeps: scenario (always), recent messages (high priority)
  // Removes: old summaries (low priority), some artifacts
}
```

**Result**: Context always fits budget, most important info preserved.

---

## Quick Implementation Checklist

### Phase 1: Foundation (Start Here)

- [ ] Create `ContextCompiler` class
- [ ] Create `ContextProcessor` interface
- [ ] Implement `MessageHistoryProcessor`
- [ ] Implement `ScenarioContextProcessor`
- [ ] Update `PairSession` to use compiler (with feature flag)
- [ ] Test with existing scenarios

### Phase 2: Persistence

- [ ] Create `SessionStorage` interface
- [ ] Implement file-based or DB storage
- [ ] Create `SessionManager` for save/load
- [ ] Add session persistence to `PairSession`
- [ ] Test session resume functionality

### Phase 3: Memory

- [ ] Create `Memory` class
- [ ] Implement `MemoryStorage` (file/DB)
- [ ] Create `MemoryProcessor` for context compilation
- [ ] Add learning hooks to session lifecycle
- [ ] Test cross-session recall

### Phase 4: Artifacts

- [ ] Create `ArtifactRegistry` class
- [ ] Implement `ArtifactStorage`
- [ ] Create `ArtifactProcessor`
- [ ] Add artifact registration to file operations
- [ ] Test artifact loading and referencing

---

## Testing Your Implementation

### Test 1: Context Size Reduction

```typescript
// Before optimization
const beforeSize = estimateTokens(session.context)

// After optimization
const compiled = await compiler.compile(sources)
const afterSize = compiled.tokenCount

console.log(`Reduction: ${((1 - afterSize/beforeSize) * 100).toFixed(1)}%`)
// Target: 50-70% reduction
```

### Test 2: Session Persistence

```typescript
// Save session mid-conversation
await sessionManager.saveSession(session)

// Kill process, restart

// Resume session
const resumed = await sessionManager.loadSession(session.id)
console.log(`Resumed with ${resumed.messages.length} messages`)
// Should have all previous messages
```

### Test 3: Cross-Session Memory

```typescript
// Session 1: Store learning
await memory.store({
  key: 'pattern:mvc',
  value: { works_well: true, team_preferred: true },
  source: 'agent',
  sessionId: 'session-1',
  relevance: 1.0,
  tags: ['pattern', 'architecture']
})

// Session 2: Recall learning
const patterns = await memory.recall({ tags: ['pattern'] })
console.log(patterns)  // Should include MVC pattern
```

---

## Common Pitfalls to Avoid

### ❌ Don't: Store everything in context

```typescript
// BAD
context.allFiles = await readAllFiles()  // Huge!
context.fullHistory = allMessages        // Unbounded!
```

### ✅ Do: Reference and summarize

```typescript
// GOOD
context.files = await artifacts.listSummaries()    // Small
context.recentHistory = messages.slice(-10)       // Bounded
context.historySummary = summarize(oldMessages)  // Compressed
```

### ❌ Don't: Mutate context directly

```typescript
// BAD
context.newThing = data
context.anotherThing = moreData  // Growing mutable object
```

### ✅ Do: Compile from sources

```typescript
// GOOD
const context = await compiler.compile({
  session: immutableSessionState,
  memory: immutableMemory,
  artifacts: immutableRegistry
})  // Fresh, optimized context every time
```

### ❌ Don't: Forget to clean up memory

```typescript
// BAD - memory grows forever
await memory.store(entry)  // Never deleted
```

### ✅ Do: Implement decay and cleanup

```typescript
// GOOD - old, irrelevant memories fade
await memory.decay()  // Reduce relevance over time
await memory.forget({ relevance: { $lt: 0.1 } })  // Delete very old
```

---

## Next Steps

1. **Read the full analysis**: `docs/ADK-CONTEXT-ENGINEERING-ANALYSIS.md`
2. **Start with Phase 1**: Create the context compiler
3. **Measure improvements**: Track context size before/after
4. **Iterate**: Add processors based on your specific needs

## Questions?

- How do I choose which processors to implement first?
  - Start with `MessageHistoryProcessor` - biggest impact

- How do I know if context engineering is working?
  - Measure: token count, agent response quality, session duration

- Can I use this with my existing code?
  - Yes! Use feature flags to gradually migrate

- What storage should I use for memory/artifacts?
  - Start simple: JSON files
  - Later: SQLite, PostgreSQL, or Redis for production
