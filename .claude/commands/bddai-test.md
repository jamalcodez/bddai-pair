# Verify implementation matches scenarios

You are helping verify that code implementation matches BDD scenarios.

## Step 1: Check Implementation Status

Look at scenario markdown files in `bddai/scenarios/*/`:
- Check implementation status checkboxes
- Which scenarios are implemented?
- Which are pending?

Use MCP tools if available:
- `list_scenarios("feature-name")` - See all scenarios for a feature
- `read_scenario_detail("feature", "scenario")` - Read specific scenario

## Step 2: Manual Verification Process

Since automated BDD tests may not be set up yet, manually verify:

### For Each Scenario:

1. **Read the scenario** from `bddai/features/{feature}.feature`
2. **Find the implementation** (use file paths from project.md)
3. **Check each Given/When/Then step**:
   - ✅ Given: Setup code exists?
   - ✅ When: Action code exists?
   - ✅ Then: Validation/assertion exists?

### Example Verification:

**Scenario Step**: "Then a JWT token should be generated"

**Check Implementation**:
```typescript
// ✅ Found in src/services/AuthService.ts:
const token = this.jwtService.sign({ userId: user.id });
```

**Scenario Step**: "And the token should expire in 24 hours"

**Check Implementation**:
```typescript
// ✅ Found in src/services/AuthService.ts:
const token = this.jwtService.sign(
  { userId: user.id },
  { expiresIn: '24h' }  // ✅ Matches requirement
);
```

## Step 3: Run Automated Tests (If Available)

If the project has test suites:
```bash
npm test
# or
pnpm test
# or
bddai test
```

Review results:
- **Passing**: Implementation matches scenario ✅
- **Failing**: Implementation doesn't match scenario ❌
- **Not implemented**: No test for this scenario yet ⚠️

## Step 4: Report Verification Results

Present findings:
```
🧪 Scenario Verification: user-authentication

Feature: User Login
  ✅ Successful login (all steps implemented)
  ✅ Invalid credentials error (all steps implemented)
  ⚠️  Rate limiting (partially implemented - missing counter reset)
  ❌ Account lockout (not implemented yet)

📊 Coverage: 2/4 scenarios fully implemented (50%)

🔧 Next Steps:
1. Complete rate limiting counter reset logic
2. Implement account lockout after 5 failed attempts
3. Add tests for implemented scenarios
```

## Step 5: Guide Implementation Fixes

If scenarios aren't fully implemented:

1. **Use MCP tools** to re-read the scenario
2. **Use MCP tools** to read project conventions
3. **Generate missing code** following the patterns
4. **Link code to scenario steps** with comments

Example fix:
```typescript
// Implements: "And account should be locked after 5 failed attempts"
if (failedAttempts >= 5) {
  await this.userRepository.lockAccount(user.id);
  throw new Error('Account locked due to repeated failed login attempts');
}
```

## Step 6: Update Status

Update `bddai/scenarios/{feature}/{scenario}.md`:
```markdown
## Implementation Status
- [x] Completed  ← Update this
- [ ] In progress
- [ ] Not started
```

## Remember

**Scenarios ARE the specification**:
- If scenario says it, code must do it
- If code does it but scenario doesn't say it, remove it (scope creep)
- Implementation should map 1:1 to scenario steps
