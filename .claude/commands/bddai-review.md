# Review BDD scenarios for quality

You are reviewing BDD scenarios to ensure they properly ground AI responses.

## Step 1: Locate Scenarios

Check these locations:
- **Gherkin features**: `bddai/features/*.feature`
- **Detailed scenarios**: `bddai/scenarios/*/`
- **Analysis report**: `bddai/analysis-report.md`

Use MCP tools if available:
- `list_features` - See all features
- `read_scenario("feature-name")` - Read specific feature

## Step 2: Review Each Feature

For each `.feature` file, analyze:

### Clarity & Testability
- ✅ Scenarios are clear and unambiguous?
- ✅ Given/When/Then steps are well-defined?
- ✅ Each scenario can be implemented as code?
- ✅ Success criteria are measurable?

### Coverage
- ✅ All acceptance criteria from PRD covered?
- ✅ Happy path scenario exists?
- ✅ Error cases included?
- ✅ Edge cases identified?

### Grounding Quality
- ✅ Specific enough for AI to implement without guessing?
- ✅ File paths, field names, patterns defined?
- ✅ Links to project.md conventions clear?

### BDD Best Practices
- ✅ Scenarios are independent (can run in any order)?
- ✅ Steps are reusable across scenarios?
- ✅ Each scenario tests ONE behavior?
- ✅ Language from user's perspective (not technical)?
- ✅ No implementation details in scenarios?

## Step 3: Check Project Conventions

Read `bddai/project.md`:
- Are file structures defined clearly?
- Are naming conventions documented?
- Are code patterns provided as examples?
- Would AI know WHERE to put code?
- Would AI know HOW to name things?

## Step 4: Suggest Improvements

If scenarios are vague or incomplete:

**Bad Scenario** (AI will hallucinate):
```gherkin
Scenario: User logs in
  Given a user
  When they login
  Then they are authenticated
```

**Good Scenario** (AI is grounded):
```gherkin
Scenario: Successful login with valid credentials
  Given a user exists with email "user@example.com" and password "SecurePass123!"
  When the user submits a POST request to "/api/auth/login" with valid credentials
  Then the system should return HTTP 200
  And the response should contain a JWT token
  And the token should expire in 24 hours
  And the token should include userId and email in claims
```

## Step 5: Verify Detailed Scenarios

Check `bddai/scenarios/{feature}/*.md` files:
- Implementation status tracking present?
- Links back to requirements?
- Implementation notes section available?

## Step 6: Report Quality Score

Present findings:
```
📋 Scenario Review: user-authentication

✅ Clarity: 9/10
✅ Coverage: 8/10 (missing rate limiting scenario)
✅ Grounding Quality: 10/10 (very specific)
⚠️  BDD Practices: 7/10 (some implementation details leaked)

💡 Suggestions:
1. Add scenario for rate limiting after 5 failed attempts
2. Remove database implementation details from scenarios
3. Consider edge case: expired password reset token

📊 Overall: 85/100 - Good for grounding AI
```

## Remember

**Purpose**: Scenarios ground AI to prevent hallucination

**Good scenarios** = AI generates EXACTLY what you want
**Vague scenarios** = AI guesses and hallucinates
