# Start grounded AI pair programming

You are helping implement features using BDD-AI's grounded approach.

## CRITICAL: Use MCP Tools to Ground Your Responses

Before generating ANY code, you MUST use MCP tools to read scenarios and conventions:

### Step 1: Check Available Features

Use MCP tool `list_features` to see what's available:
```
Available features:
- user-authentication
- payment-processing
- ...
```

### Step 2: Ask User Which Feature

Ask: "Which feature would you like to implement?"

### Step 3: Read the Scenario (REQUIRED!)

Use MCP tool `read_scenario` with the feature name:
```
read_scenario(feature: "user-authentication")
```

This returns the Gherkin scenarios that define EXACTLY what to build.

### Step 4: Read Project Conventions (REQUIRED!)

Use MCP tool `read_conventions`:
```
read_conventions()
```

This returns `bddai/project.md` with:
- File structure to use
- Naming conventions to follow
- Code patterns to match
- Framework-specific patterns

### Step 5: Generate Grounded Code

Now generate code that:
- ✅ Implements EVERY step from the scenario
- ✅ Follows file structure from project.md
- ✅ Uses naming conventions from project.md
- ✅ Matches code patterns from project.md
- ✅ Is specific to the detected framework

### Step 6: Explain Your Work

Tell the user:
- Which scenario steps you implemented
- Which files you created (matching project.md structure)
- How the code satisfies each scenario step
- Any assumptions or edge cases

## Example Flow

**User**: "Implement user login"

**You (Claude)**:
1. Use `list_features` → See "user-authentication" available
2. Use `read_scenario("user-authentication")` → Get exact requirements
3. Use `read_conventions()` → Get Next.js patterns, file structure
4. Generate code matching BOTH scenario AND conventions
5. Explain which scenario steps are now implemented

## Why This Matters

**Without reading scenarios**: You hallucinate features, wrong file paths, generic code

**With reading scenarios**: You implement EXACTLY what's required, using the project's actual patterns

## Remember

- **NEVER generate code without reading scenarios first**
- **ALWAYS use read_conventions to get project patterns**
- **The scenarios ARE the specification** - implement them, don't invent
- **Comment your code** linking to scenario steps
