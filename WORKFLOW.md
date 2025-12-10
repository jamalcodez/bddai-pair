# BDD-AI Pair - Complete Workflow Guide

This guide demonstrates the complete workflow for using BDD-AI Pair to prevent AI hallucination and ensure grounded code generation.

## Overview

BDD-AI Pair prevents AI hallucination by:
1. **Breaking down PRDs** into structured BDD scenarios
2. **Storing scenarios as markdown files** that AI can read
3. **Grounding AI responses** in actual project requirements and conventions
4. **No vector DB needed** - simple, human-readable markdown files

## Quick Start

```bash
# 1. Install BDD-AI
npm install -g @bddai/cli

# 2. Initialize in your project
cd my-project
bddai init

# 3. Add your PRD
cp my-product-requirements.md requirements/

# 4. Generate scenarios
bddai requirements analyze

# 5. Start coding with AI (Claude Code or Cursor)
# AI will automatically read scenarios before generating code!
```

## Complete Workflow

### Step 1: Initialize BDD-AI in Your Project

```bash
cd my-typescript-project
bddai init
```

**What it creates:**
```
my-project/
├── bddai/
│   ├── project.md           # Auto-detected project conventions
│   ├── features/            # Generated feature files
│   └── scenarios/           # Detailed scenario files
├── requirements/            # Your PRD files go here
│   └── user-authentication.prd  # Example PRD
├── .cursorrules            # Cursor AI behavior rules (if using Cursor)
└── .claude/                # Claude Code MCP config (if using Claude Code)
    └── mcp-setup.md
```

**bddai/project.md contains:**
- Detected framework (Next.js, React, Express, etc.)
- File structure patterns
- Naming conventions
- Code templates
- Tech stack info

This grounds the AI in YOUR project's actual conventions!

### Step 2: Add Your Product Requirements (PRD)

Create a PRD in `requirements/`:

```markdown
# User Authentication PRD

## Overview
User authentication system with email/password and JWT tokens.

## User Stories

### As a user
I want to register with email and password
So that I can create an account

**Acceptance Criteria:**
- Email must be unique
- Password must be at least 8 characters
- Email validation required
- Password is hashed before storage
- Returns JWT token on successful registration

### As a user
I want to login with my credentials
So that I can access protected resources

**Acceptance Criteria:**
- User submits email and password
- System validates credentials
- Returns JWT token on success
- Token expires after 24 hours
- Failed attempts are rate limited

## Features

### User Registration
- Email/password registration
- Password strength validation
- Email uniqueness check
- Secure password hashing

### User Login
- Email/password authentication
- JWT token generation
- Session management
- Rate limiting
```

### Step 3: Analyze Requirements

```bash
bddai requirements analyze
```

**Output:**
```
✓ Analyzing requirements...
✓ Saving features and scenarios to bddai/...

📁 Created Files:
  ✓ Analysis report: bddai/analysis-report.md
  ✓ Feature files: 2 files
  ✓ Scenario files: 8 files

📋 Analysis Summary:
  Total Features: 2
  Total Scenarios: 8

✅ Generated Features:
  • User Registration (4 scenarios)
  • User Login (4 scenarios)

📊 Validation Score: 95/100
```

**Generated structure:**
```
bddai/
├── analysis-report.md       # Full analysis
├── features/
│   ├── user-registration.feature     # Gherkin scenarios
│   └── user-login.feature
└── scenarios/
    ├── user-registration/
    │   ├── successful-registration.md
    │   ├── duplicate-email-error.md
    │   ├── weak-password-error.md
    │   └── invalid-email-error.md
    └── user-login/
        ├── successful-login.md
        ├── invalid-credentials-error.md
        ├── rate-limit-exceeded.md
        └── expired-session-handling.md
```

### Step 4: Review Generated Scenarios

**Example: `bddai/features/user-registration.feature`**
```gherkin
@priority-high
@complexity-medium

Feature: User Registration
  Users can register with email and password to create an account

  @happy-path
  Scenario: Successful registration
    Given a new user with email "user@example.com"
    And a valid password "SecurePass123!"
    When the user submits registration request
    Then the system should create a new user account
    And the password should be hashed
    And a JWT token should be generated
    And the token should expire in 24 hours

  @error-case
  Scenario: Duplicate email error
    Given a user already exists with email "existing@example.com"
    When a new user tries to register with the same email
    Then the system should return error "Email already registered"
    And no new user should be created

  @validation
  Scenario: Weak password error
    Given a new user with email "user@example.com"
    And a weak password "123"
    When the user submits registration request
    Then the system should return error "Password must be at least 8 characters"
    And no user should be created
```

**Example: `bddai/scenarios/user-registration/successful-registration.md`**
```markdown
# Scenario: Successful registration

**Feature:** User Registration
**Type:** happy-path
**Source:** PRD requirements
**Confidence:** 95%

## Scenario

\`\`\`gherkin
Scenario: Successful registration
  Given a new user with email "user@example.com"
  And a valid password "SecurePass123!"
  When the user submits registration request
  Then the system should create a new user account
  And the password should be hashed
  And a JWT token should be generated
  And the token should expire in 24 hours
\`\`\`

## Implementation Status
- [ ] Not started
- [ ] In progress
- [ ] Completed

## Implementation Notes
<!-- Add notes as you implement -->
```

### Step 5A: Code with Claude Code (MCP Integration)

**Setup (one-time):**

Add to your Claude Code MCP settings (~/.config/claude-code/mcp.json):
```json
{
  "bddai": {
    "command": "npx",
    "args": ["bddai-mcp-server"],
    "cwd": "/path/to/your/project"
  }
}
```

**Usage:**

Just ask Claude Code to implement a feature:

```
You: Implement user registration
```

**What happens (automatic):**
1. Claude Code uses MCP to call `read_scenario("user-registration")`
2. Gets the actual Gherkin scenarios from `bddai/features/user-registration.feature`
3. Claude Code uses MCP to call `read_conventions()`
4. Gets project conventions from `bddai/project.md`
5. Claude Code generates code that:
   - ✅ Implements all scenario steps
   - ✅ Follows your project's file structure
   - ✅ Uses your naming conventions
   - ✅ Matches your code patterns
   - ✅ **NO HALLUCINATION** - grounded in actual requirements!

**Claude Code's response:**
```typescript
// src/services/AuthService.ts
// (Following patterns from bddai/project.md)

export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private passwordHasher: PasswordHasher,
    private jwtService: JwtService
  ) {}

  async register(email: string, password: string): Promise<AuthResult> {
    // Implements: "a user already exists with email"
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Implements: "Password must be at least 8 characters"
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Implements: "password should be hashed"
    const hashedPassword = await this.passwordHasher.hash(password);

    // Implements: "create a new user account"
    const user = await this.userRepository.create({
      email,
      password: hashedPassword,
    });

    // Implements: "JWT token should be generated"
    // Implements: "token should expire in 24 hours"
    const token = await this.jwtService.sign(
      { userId: user.id },
      { expiresIn: '24h' }
    );

    return { user, token };
  }
}
```

**Notice:**
- ✅ Implements EVERY step from the scenario
- ✅ Handles error cases from scenarios
- ✅ Follows file structure from project.md
- ✅ Uses naming patterns from project.md
- ✅ Comments link back to scenario steps

### Step 5B: Code with Cursor

**Setup (automatic):**

`bddai init` already created `.cursorrules` that tells Cursor:
1. Read `bddai/features/{feature}.feature` BEFORE generating code
2. Read `bddai/project.md` for conventions
3. Follow file structure, naming, and patterns exactly

**Usage:**

In Cursor, just ask:

```
You: Implement user registration
```

**Cursor automatically:**
1. Reads `bddai/features/user-registration.feature`
2. Reads `bddai/project.md`
3. Generates code matching scenarios and conventions
4. **NO HALLUCINATION**

Example Cursor response:
```
I'll implement user registration. Let me first read the scenarios and conventions.

Reading: bddai/features/user-registration.feature
Reading: bddai/project.md

Based on the scenarios, I need to implement:
1. Registration endpoint (follows controller pattern from project.md)
2. Email uniqueness validation (from scenario)
3. Password validation (8+ chars from scenario)
4. Password hashing (from scenario)
5. JWT token generation with 24h expiry (from scenario)

Following your project structure (src/controllers/, src/services/):

[Generates grounded code...]
```

## Key Benefits

### 1. **No Hallucination**
AI reads actual requirements from markdown files, not making up features

### 2. **Project-Specific Code**
AI uses YOUR conventions from project.md, not generic templates

### 3. **Human-Readable**
Scenarios are markdown files you can read, review, and edit

### 4. **Git-Friendly**
All scenarios are version-controlled with your code

### 5. **No Complex Setup**
No vector databases, no embeddings, just markdown files

### 6. **Works with Any IDE**
- Claude Code: MCP server provides tools
- Cursor: .cursorrules guide AI behavior
- Other IDEs: Can read markdown files

## Advanced Usage

### Updating Scenarios

Edit scenario files directly:
```bash
vim bddai/scenarios/user-registration/successful-registration.md
```

AI will use your updated scenarios next time!

### Custom Conventions

Edit project.md to add your patterns:
```bash
vim bddai/project.md
```

Add your team's specific patterns:
```markdown
## Code Patterns

### Error Handling Pattern
\`\`\`typescript
export class CustomError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
  }
}

export function handleError(error: unknown): CustomError {
  if (error instanceof CustomError) return error;
  return new CustomError('Internal error', 'INTERNAL_ERROR', 500);
}
\`\`\`

Use this pattern for all error handling.
```

### Multiple PRDs

Analyze all PRDs at once:
```bash
# Add multiple PRDs
cp product-feature-1.md requirements/
cp product-feature-2.md requirements/

# Analyze all
bddai requirements analyze

# Generates scenarios for all features
```

### Validation

Check scenario quality:
```bash
bddai requirements validate

# Output:
# Validation Score: 95/100
# ⚠️  Warnings:
#   • Feature X missing edge case scenarios
# ✅ Validation passed!
```

## Troubleshooting

### "No project.md found"
Run `bddai init` in your project root.

### "Feature file not found"
Run `bddai requirements analyze` to generate scenarios from PRDs.

### AI still generating wrong code
Check that:
1. `.cursorrules` exists (Cursor)
2. MCP server is configured (Claude Code)
3. `bddai/project.md` has correct conventions
4. Scenarios match requirements

### Want to start fresh
```bash
bddai init --force
bddai requirements analyze --force
```

## Comparison: Before vs After

### Before BDD-AI (Hallucination Risk)

**You:**
> Implement user registration

**AI (hallucinating):**
```typescript
// AI invents file structure
import { UserService } from './user-service';  // ❌ Wrong path

// AI invents field names
async register(username, pass) {  // ❌ Your app uses email, not username

// AI invents error handling
  if (!username) throw 'Invalid';  // ❌ Wrong error format

// AI invents storage
  await db.users.insert({...});  // ❌ You use Prisma, not raw DB
}
```

### After BDD-AI (Grounded)

**You:**
> Implement user registration

**AI (reading bddai/ files):**
```typescript
// Uses correct path from project.md
import { UserRepository } from '@/repositories/UserRepository';

// Uses correct field names from scenarios
async register(email: string, password: string) {

// Uses error handling from project.md
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }

// Uses repository pattern from project.md
  return await this.userRepository.create({ email, password });
}
```

## Next Steps

1. **Run `bddai init`** in your project
2. **Add a PRD** to `requirements/`
3. **Run `bddai requirements analyze`**
4. **Review** generated scenarios in `bddai/`
5. **Configure your IDE** (Claude Code MCP or Cursor)
6. **Start coding** with grounded AI!

## Real-World Example

See the example workflow in action:
```bash
cd examples/nextjs-app
cat requirements/user-auth.prd
cat bddai/project.md
cat bddai/features/user-authentication.feature
cat bddai/scenarios/user-authentication/successful-login.md
```

## Philosophy

**The Problem:** AI hallucinates code that doesn't match your requirements or conventions.

**The Solution:** Give AI structured, readable context about:
1. What to build (scenarios from PRDs)
2. How to build it (project conventions)

**The Result:** AI generates code grounded in YOUR actual requirements and patterns.

No vector databases. No embeddings. Just markdown files that humans AND AI can read.

---

**Questions?** Check out the [FAQ](./FAQ.md) or [open an issue](https://github.com/your-repo/issues).
