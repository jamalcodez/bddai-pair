# Context Engineering Implementation Guide

This guide provides step-by-step instructions to implement context engineering in bddai-pair based on Google ADK principles.

## Phase 1: Context Compiler Foundation

### Step 1: Create Base Interfaces

Create `packages/core/src/context/types.ts`:

```typescript
import { GherkinScenario, AgentMessage } from '@bddai/types'

/**
 * Source of truth - durable state
 */
export interface SessionState {
  id: string
  scenario: string
  agents: AgentState[]
  messages: AgentMessage[]
  metadata: SessionMetadata
  createdAt: Date
  updatedAt: Date
}

export interface AgentState {
  id: string
  type: 'driver' | 'navigator' | 'reviewer'
  decisions: Decision[]
  implementations: Implementation[]
}

export interface SessionMetadata {
  feature?: string
  tags: string[]
  status: 'active' | 'paused' | 'completed' | 'failed'
  turnCount: number
}

/**
 * Compiled view - what goes to LLM
 */
export interface CompiledContext {
  workingContext: WorkingContext
  tokenCount: number
  timestamp: Date
  processorChain: string[]  // Which processors ran
}

export interface WorkingContext {
  scenario: ScenarioContext
  conversation: ConversationContext
  agents: AgentContext
  artifacts?: ArtifactContext
  memory?: MemoryContext
  metadata: Record<string, any>
}

export interface ScenarioContext {
  name: string
  currentStep?: string
  requirements: string[]
  tags: string[]
}

export interface ConversationContext {
  recentMessages: AgentMessage[]
  summary?: string
  turnCount: number
}

export interface AgentContext {
  currentAgent: string
  role: 'driver' | 'navigator' | 'reviewer'
  capabilities: string[]
}

/**
 * Context sources
 */
export interface ContextSources {
  session: SessionState
  memory?: Memory
  artifacts?: ArtifactRegistry
}

/**
 * Processor interface
 */
export interface ContextProcessor {
  name: string
  priority: number  // Lower = runs first
  process(context: WorkingContext, sources: ContextSources): Promise<WorkingContext>
}

/**
 * Storage interfaces (implement later)
 */
export interface Memory {
  recall(query: MemoryQuery): Promise<MemoryEntry[]>
  store(entry: MemoryEntry): Promise<void>
}

export interface MemoryQuery {
  tags?: string[]
  minRelevance?: number
  limit?: number
}

export interface MemoryEntry {
  key: string
  value: any
  relevance: number
  tags: string[]
  timestamp: Date
}

export interface ArtifactRegistry {
  getByType(type: string): Artifact[]
  getById(id: string): Artifact | undefined
  getContent(artifact: Artifact): Promise<string>
}

export interface Artifact {
  id: string
  name: string
  type: 'code' | 'document' | 'log' | 'test'
  path: string
  summary: string
  version: number
  updatedAt: Date
}

export interface Decision {
  type: string
  description: string
  reasoning: string
  timestamp: Date
}

export interface Implementation {
  component: string
  code: string
  tests: string[]
  timestamp: Date
}

export interface MemoryContext {
  relevantMemories: MemoryEntry[]
  patterns: string[]
  learnings: string[]
}

export interface ArtifactContext {
  references: ArtifactReference[]
  loader: (id: string) => Promise<string>
}

export interface ArtifactReference {
  id: string
  name: string
  type: string
  summary: string
}
```

### Step 2: Create Context Compiler

Create `packages/core/src/context/ContextCompiler.ts`:

```typescript
import {
  ContextSources,
  CompiledContext,
  WorkingContext,
  ContextProcessor,
  SessionState
} from './types'

/**
 * Context Compiler - transforms durable state into optimized LLM context
 * Based on Google ADK principles
 */
export class ContextCompiler {
  private processors: ContextProcessor[] = []

  constructor() {
    // Processors will be registered
  }

  /**
   * Register a context processor
   */
  registerProcessor(processor: ContextProcessor): void {
    this.processors.push(processor)
    // Sort by priority (lower = runs first)
    this.processors.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Compile context from sources
   */
  async compile(sources: ContextSources): Promise<CompiledContext> {
    const startTime = Date.now()

    // Initialize base context
    let workingContext = this.initializeBaseContext(sources.session)

    // Run through processor pipeline
    const processorChain: string[] = []
    for (const processor of this.processors) {
      try {
        workingContext = await processor.process(workingContext, sources)
        processorChain.push(processor.name)
      } catch (error) {
        console.error(`Processor ${processor.name} failed:`, error)
        // Continue with other processors
      }
    }

    // Estimate token count
    const tokenCount = this.estimateTokens(workingContext)

    const compiled: CompiledContext = {
      workingContext,
      tokenCount,
      timestamp: new Date(),
      processorChain
    }

    const duration = Date.now() - startTime
    console.debug(`Context compiled in ${duration}ms, ${tokenCount} tokens, ${processorChain.length} processors`)

    return compiled
  }

  /**
   * Initialize base context from session state
   */
  private initializeBaseContext(session: SessionState): WorkingContext {
    return {
      scenario: {
        name: session.scenario,
        requirements: [],
        tags: session.metadata.tags
      },
      conversation: {
        recentMessages: [],
        turnCount: session.metadata.turnCount
      },
      agents: {
        currentAgent: session.agents[0]?.id || '',
        role: session.agents[0]?.type || 'driver',
        capabilities: []
      },
      metadata: {
        sessionId: session.id,
        status: session.metadata.status,
        createdAt: session.createdAt
      }
    }
  }

  /**
   * Rough token estimation (4 chars ≈ 1 token)
   */
  private estimateTokens(context: WorkingContext): number {
    const json = JSON.stringify(context)
    return Math.ceil(json.length / 4)
  }
}
```

### Step 3: Create First Processor - Message History

Create `packages/core/src/context/processors/MessageHistoryProcessor.ts`:

```typescript
import {
  ContextProcessor,
  WorkingContext,
  ContextSources,
  AgentMessage
} from '../types'

/**
 * Manages message history in context
 * - Keeps recent messages in full
 * - Summarizes older messages
 */
export class MessageHistoryProcessor implements ContextProcessor {
  name = 'MessageHistory'
  priority = 10  // Run early

  constructor(
    private recentMessageCount: number = 10,
    private enableSummarization: boolean = true
  ) {}

  async process(context: WorkingContext, sources: ContextSources): Promise<WorkingContext> {
    const messages = sources.session.messages

    if (messages.length <= this.recentMessageCount) {
      // All messages are recent
      context.conversation.recentMessages = messages
      return context
    }

    // Split messages
    const recentMessages = messages.slice(-this.recentMessageCount)
    const oldMessages = messages.slice(0, -this.recentMessageCount)

    context.conversation.recentMessages = recentMessages

    // Summarize old messages if enabled
    if (this.enableSummarization && oldMessages.length > 0) {
      context.conversation.summary = this.summarizeMessages(oldMessages)
    }

    return context
  }

  /**
   * Simple message summarization
   * In production, use LLM for better summaries
   */
  private summarizeMessages(messages: AgentMessage[]): string {
    const messagesByType = messages.reduce((acc, msg) => {
      acc[msg.type] = (acc[msg.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const parts: string[] = []

    if (messagesByType['proposal']) {
      parts.push(`${messagesByType['proposal']} proposal(s) discussed`)
    }
    if (messagesByType['implementation']) {
      parts.push(`${messagesByType['implementation']} implementation(s) completed`)
    }
    if (messagesByType['question']) {
      parts.push(`${messagesByType['question']} question(s) addressed`)
    }
    if (messagesByType['error']) {
      parts.push(`${messagesByType['error']} error(s) handled`)
    }

    return `Earlier conversation (${messages.length} messages): ${parts.join(', ')}`
  }
}
```

### Step 4: Create Scenario Context Processor

Create `packages/core/src/context/processors/ScenarioContextProcessor.ts`:

```typescript
import {
  ContextProcessor,
  WorkingContext,
  ContextSources,
  GherkinScenario
} from '../types'

/**
 * Adds scenario-specific context
 */
export class ScenarioContextProcessor implements ContextProcessor {
  name = 'ScenarioContext'
  priority = 5  // Run very early

  async process(context: WorkingContext, sources: ContextSources): Promise<WorkingContext> {
    // Extract scenario info from session
    const scenario = sources.session.scenario
    const messages = sources.session.messages

    // Identify current step based on conversation
    const currentStep = this.identifyCurrentStep(messages)

    context.scenario = {
      name: scenario,
      currentStep,
      requirements: this.extractRequirements(messages),
      tags: sources.session.metadata.tags
    }

    return context
  }

  /**
   * Identify what step of implementation we're on
   */
  private identifyCurrentStep(messages: AgentMessage[]): string | undefined {
    const recentMessages = messages.slice(-5)

    for (const msg of recentMessages.reverse()) {
      if (msg.type === 'proposal') {
        return 'architecture-design'
      }
      if (msg.type === 'implementation') {
        return 'implementation'
      }
      if (msg.type === 'review') {
        return 'review'
      }
    }

    return 'planning'
  }

  /**
   * Extract requirements from conversation
   */
  private extractRequirements(messages: AgentMessage[]): string[] {
    const requirements: Set<string> = new Set()

    for (const msg of messages) {
      if (msg.payload?.requirements) {
        msg.payload.requirements.forEach((req: string) => requirements.add(req))
      }
    }

    return Array.from(requirements)
  }
}
```

### Step 5: Integrate with PairSession

Update `packages/core/src/agents/PairSession.ts`:

```typescript
import { ContextCompiler } from '../context/ContextCompiler'
import { MessageHistoryProcessor } from '../context/processors/MessageHistoryProcessor'
import { ScenarioContextProcessor } from '../context/processors/ScenarioContextProcessor'
import { SessionState, CompiledContext } from '../context/types'

export class PairSession extends EventEmitter implements IPairSession {
  // ... existing properties ...

  // NEW: Context engineering
  private contextCompiler: ContextCompiler
  private sessionState: SessionState
  private useContextEngineering: boolean

  constructor(
    scenario: string,
    driverAgent: AIAgent,
    navigatorAgent: AIAgent,
    reviewerAgent?: AIAgent
  ) {
    super()
    // ... existing initialization ...

    // Initialize context compiler
    this.useContextEngineering = process.env.ENABLE_CONTEXT_ENGINEERING === 'true'
    this.contextCompiler = new ContextCompiler()

    // Register processors
    this.contextCompiler.registerProcessor(new ScenarioContextProcessor())
    this.contextCompiler.registerProcessor(new MessageHistoryProcessor())

    // Initialize session state
    this.sessionState = {
      id: this.id,
      scenario: this.scenario,
      agents: [
        { id: this.driver, type: 'driver', decisions: [], implementations: [] },
        { id: this.navigator, type: 'navigator', decisions: [], implementations: [] }
      ],
      messages: [],
      metadata: {
        tags: [],
        status: 'active',
        turnCount: 0
      },
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  /**
   * Get compiled context (new way) or legacy context (old way)
   */
  async getCompiledContext(): Promise<CompiledContext> {
    if (!this.useContextEngineering) {
      // Legacy mode - wrap old context
      return {
        workingContext: this.context as any,
        tokenCount: this.estimateTokens(this.context),
        timestamp: new Date(),
        processorChain: []
      }
    }

    // New mode - compile from sources
    return this.contextCompiler.compile({
      session: this.sessionState
      // memory and artifacts will be added in later phases
    })
  }

  /**
   * Update session state when messages are sent
   */
  async sendMessage(message: AgentMessage): Promise<void> {
    // Add to message history
    this.messages.push(message)
    this.sessionState.messages.push(message)
    this.sessionState.updatedAt = new Date()
    this.sessionState.metadata.turnCount++

    // ... rest of existing sendMessage logic ...
  }

  private estimateTokens(obj: any): number {
    const json = JSON.stringify(obj)
    return Math.ceil(json.length / 4)
  }
}
```

### Step 6: Update Agents to Use Compiled Context

Update `packages/core/src/agents/DriverAgent.ts`:

```typescript
export class DriverAgent implements AIAgent {
  // ... existing code ...

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    // Get compiled context if available
    const compiledContext = message.context?.getCompiledContext
      ? await message.context.getCompiledContext()
      : message.context

    // Use compiled context in processing
    switch (message.type) {
      case MessageType.PROPOSAL:
        return this.handleProposal(message, compiledContext)

      case MessageType.QUESTION:
        return this.handleQuestion(message, compiledContext)

      // ... other cases ...
    }
  }

  private async handleProposal(
    message: AgentMessage,
    compiledContext?: CompiledContext
  ): Promise<AgentMessage> {
    // Use compiled context if available
    const context = compiledContext?.workingContext || message.context

    console.log(`Processing with ${compiledContext?.tokenCount || '?'} tokens`)
    console.log(`Processors used: ${compiledContext?.processorChain.join(', ') || 'none'}`)

    // ... rest of handleProposal logic ...
  }
}
```

### Step 7: Testing

Create `packages/core/src/context/__tests__/ContextCompiler.test.ts`:

```typescript
import { ContextCompiler } from '../ContextCompiler'
import { MessageHistoryProcessor } from '../processors/MessageHistoryProcessor'
import { ScenarioContextProcessor } from '../processors/ScenarioContextProcessor'
import { SessionState, ContextSources } from '../types'

describe('ContextCompiler', () => {
  it('should compile context with processors', async () => {
    const compiler = new ContextCompiler()
    compiler.registerProcessor(new ScenarioContextProcessor())
    compiler.registerProcessor(new MessageHistoryProcessor(5))

    const sessionState: SessionState = {
      id: 'test-session',
      scenario: 'User Login',
      agents: [
        { id: 'driver-1', type: 'driver', decisions: [], implementations: [] }
      ],
      messages: Array.from({ length: 20 }, (_, i) => ({
        id: `msg-${i}`,
        from: 'driver' as any,
        to: 'navigator' as any,
        type: 'proposal' as any,
        timestamp: new Date(),
        payload: {},
        context: {}
      })),
      metadata: {
        tags: ['@auth'],
        status: 'active',
        turnCount: 20
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const sources: ContextSources = { session: sessionState }
    const compiled = await compiler.compile(sources)

    expect(compiled.workingContext.scenario.name).toBe('User Login')
    expect(compiled.workingContext.conversation.recentMessages).toHaveLength(5)
    expect(compiled.workingContext.conversation.summary).toBeDefined()
    expect(compiled.tokenCount).toBeGreaterThan(0)
    expect(compiled.processorChain).toContain('ScenarioContext')
    expect(compiled.processorChain).toContain('MessageHistory')
  })

  it('should reduce context size with summarization', async () => {
    const compiler = new ContextCompiler()
    compiler.registerProcessor(new MessageHistoryProcessor(5, true))

    const messages = Array.from({ length: 50 }, (_, i) => ({
      id: `msg-${i}`,
      from: 'driver' as any,
      to: 'navigator' as any,
      type: i % 2 === 0 ? 'proposal' : 'implementation' as any,
      timestamp: new Date(),
      payload: { data: 'x'.repeat(100) },  // Some data
      context: {}
    }))

    const sessionState: SessionState = {
      id: 'test',
      scenario: 'Test',
      agents: [],
      messages,
      metadata: { tags: [], status: 'active', turnCount: 50 },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const compiled = await compiler.compile({ session: sessionState })

    // Should have recent messages + summary, not all 50
    expect(compiled.workingContext.conversation.recentMessages.length).toBe(5)
    expect(compiled.workingContext.conversation.summary).toBeDefined()
    expect(compiled.tokenCount).toBeLessThan(5000)  // Should be manageable
  })
})
```

### Step 8: Enable and Test

1. **Enable context engineering**:
```bash
export ENABLE_CONTEXT_ENGINEERING=true
```

2. **Run tests**:
```bash
pnpm test -- ContextCompiler
```

3. **Test with real session**:
```typescript
// In your test or CLI
const session = new PairSession(...)
await session.start(feature, scenario)

// After some messages
const compiled = await session.getCompiledContext()
console.log('Context size:', compiled.tokenCount, 'tokens')
console.log('Processors:', compiled.processorChain)
console.log('Recent messages:', compiled.workingContext.conversation.recentMessages.length)
console.log('Summary:', compiled.workingContext.conversation.summary)
```

---

## Expected Results

After implementing Phase 1, you should see:

1. **Context size reduction**: 40-60% smaller context
2. **Manageable message history**: Only recent messages in full
3. **Clear compilation pipeline**: Know which processors ran
4. **Backward compatibility**: Works with existing code via feature flag

---

## Next: Phase 2 - Session Persistence

Once Phase 1 is working, proceed to implement session persistence (see main analysis document).

Key additions:
- `SessionStorage` interface and implementation
- `SessionManager` for save/load/resume
- Persistence hooks in `PairSession`

---

## Troubleshooting

### Context not compiling
- Check `ENABLE_CONTEXT_ENGINEERING` is set to 'true'
- Verify processors are registered
- Check console for processor errors

### Token count not reducing
- Verify `MessageHistoryProcessor` is registered
- Check if summarization is enabled
- Increase `recentMessageCount` if needed

### Tests failing
- Ensure all type definitions are correct
- Check message format matches expectations
- Verify processor priority order

---

## Resources

- Full Analysis: `docs/ADK-CONTEXT-ENGINEERING-ANALYSIS.md`
- Quick Start: `docs/CONTEXT-ENGINEERING-QUICKSTART.md`
- Types Reference: `packages/core/src/context/types.ts`
