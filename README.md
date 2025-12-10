# BDD-AI Pair

**Stop AI Hallucination. Ground AI in Your Actual Requirements.**

BDD-AI Pair prevents AI hallucination by grounding AI responses in structured BDD scenarios and project conventions stored as simple markdown files.

## The Problem

When you ask AI to "implement user authentication," it often:
- ❌ Invents file paths that don't exist in your project
- ❌ Uses naming conventions that don't match your codebase
- ❌ Creates features you never asked for
- ❌ Generates code incompatible with your tech stack

**This is AI hallucination.**

## The Solution

BDD-AI Pair gives AI two things:
1. **What to build** - BDD scenarios generated from your PRDs
2. **How to build it** - Your project's actual conventions and patterns

All stored as **human-readable markdown files** that AI reads before generating code.

**No vector databases. No embeddings. Just markdown.**

## How It Works

1. **You write** a Product Requirements Document (PRD) in natural language
2. **BDD-AI analyzes** your PRD and generates structured BDD scenarios
3. **Scenarios are saved** as markdown files in `bddai/` directory
4. **AI reads scenarios** from markdown before generating code
5. **You get grounded code** that matches your actual requirements

```
Your PRD → BDD Scenarios → Markdown Files → AI Reads → Grounded Code
```

## Features

- ✅ **No Hallucination** - AI grounded in actual requirements
- ✅ **Project-Aware** - AI uses YOUR conventions, not generic templates
- ✅ **Human-Readable** - All scenarios are markdown you can read/edit
- ✅ **Git-Friendly** - Version control your scenarios with code
- ✅ **Simple Setup** - No vector DBs, no embeddings, just markdown
- ✅ **Works Anywhere** - Claude Code (MCP), Cursor (.cursorrules), any IDE
- ✅ **Auto-Detection** - Detects Next.js, React, Express patterns automatically

## Architecture

```
┌─────────────────────────────────────────┐
│           BDD-AI Pair Framework         │
├─────────────────────────────────────────┤
│  Requirements Layer                     │
│  ├── PRD Parser & Analyzer              │
│  ├── Natural Language Processing        │
│  └── Requirement Validation             │
├─────────────────────────────────────────┤
│  Core Engine (Behavior-First Logic)     │
│  ├── Gherkin Parser & Scenario Manager  │
│  ├── Test Generation & Orchestration    │
│  └── Living Documentation System        │
├─────────────────────────────────────────┤
│  AI Pair Programming Layer              │
│  ├── Driver Agent (Architecture)        │
│  ├── Navigator Agent (Implementation)   │
│  └── Reviewer Agent (Human Interface)   │
├─────────────────────────────────────────┤
│  Platform Adapters (Pluggable)          │
│  ├── Claude Code Adapter                │
│  ├── Cursor Adapter                     │
│  └── Generic MCP Protocol               │
├─────────────────────────────────────────┤
│  CLI & Tooling                          │
│  ├── bddai command interface            │
│  └── IDE extensions                     │
└─────────────────────────────────────────┘
```

## Quick Start

```bash
# 1. Install (when published, or build from source)
npm install -g @bddai/cli

# 2. Initialize in your existing project
cd my-nextjs-app
bddai init

# 3. Add your PRD
vim requirements/my-feature.prd

# 4. Generate grounded scenarios
bddai requirements analyze

# 5. Code with AI - scenarios ground the AI automatically!
```

**What you get:**
```
my-project/
├── bddai/
│   ├── project.md           # Auto-detected: Next.js patterns, file structure
│   ├── features/            # BDD scenarios from your PRD
│   │   └── user-auth.feature
│   └── scenarios/           # Detailed scenario markdown
│       └── user-auth/
│           ├── successful-login.md
│           └── password-reset.md
├── requirements/
│   └── my-feature.prd       # Your PRD
├── .cursorrules            # Cursor: read scenarios before coding
└── .claude/
    └── mcp-setup.md        # Claude Code: MCP server instructions
```

**Now when you ask AI to "implement user login":**
- ✅ AI reads `bddai/features/user-auth.feature`
- ✅ AI reads `bddai/project.md` for your conventions
- ✅ AI generates code matching YOUR requirements & patterns
- ✅ **NO HALLUCINATION**

## Complete Workflow

See [WORKFLOW.md](./WORKFLOW.md) for a complete step-by-step guide with examples.

**Quick example:**

1. **Your PRD** (`requirements/auth.prd`):
```markdown
# User Authentication

## User Story
As a user, I want to login with email/password
so I can access protected resources.

**Acceptance Criteria:**
- JWT token generated on success
- Token expires in 24 hours
- Rate limiting on failed attempts
```

2. **Generate scenarios:**
```bash
bddai requirements analyze
```

3. **AI reads this** (`bddai/features/user-authentication.feature`):
```gherkin
Scenario: Successful login
  Given a user exists with email "user@example.com"
  When the user submits valid credentials
  Then a JWT token should be generated
  And the token should expire in 24 hours
```

4. **AI generates grounded code** (reads your project.md patterns):
```typescript
// Matches YOUR file structure from project.md
// Uses YOUR naming from project.md
// Implements ALL scenario steps
async login(email: string, password: string) {
  // Implements: "user submits valid credentials"
  const user = await this.validateCredentials(email, password);

  // Implements: "JWT token should be generated"
  // Implements: "token should expire in 24 hours"
  const token = this.jwtService.sign(
    { userId: user.id },
    { expiresIn: '24h' }
  );

  return { user, token };
}
```

## Packages

- **@bddai/types**: Shared TypeScript type definitions
- **@bddai/core**: Core framework functionality
- **@bddai/cli**: Command-line interface
- **@bddai/claude-code-adapter**: Claude Code integration
- **@bddai/cursor-adapter**: Cursor integration

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/bddai-pair.git
cd bddai-pair

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Project Structure

```
bddai-pair/
├── packages/
│   ├── core/           # Core framework functionality
│   ├── cli/            # CLI interface
│   ├── types/          # Shared types
│   └── adapters/       # AI tool adapters
├── templates/          # Project templates
└── docs/              # Documentation
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.