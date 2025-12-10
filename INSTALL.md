# BDD-AI Installation & Setup Guide

Complete guide to installing and setting up BDD-AI for grounded AI coding.

## Prerequisites

- **Node.js** 18.0.0 or higher
- **pnpm** 8.0.0 or higher (recommended) or npm
- **Git** for version control
- **IDE**: Claude Code or Cursor (recommended)
- **Existing Project**: TypeScript/JavaScript project with package.json

```bash
# Check versions
node --version  # Should be >= 18.0.0
pnpm --version  # Should be >= 8.0.0
```

## Installation

### Option 1: From Source (Current)

Since BDD-AI is in development, install from source:

```bash
# 1. Clone the repository
git clone https://github.com/jamalcodez/bddai-pair.git
cd bddai-pair

# 2. Install dependencies
pnpm install

# 3. Build all packages
pnpm build

# 4. Link CLI globally
cd packages/cli
pnpm link --global

# 5. Verify installation
bddai --version
```

### Option 2: From NPM (When Published)

```bash
# Install globally
npm install -g @bddai/cli

# Or with pnpm
pnpm add -g @bddai/cli

# Verify
bddai --version
```

## Project Setup

### Step 1: Initialize BDD-AI in Your Project

Navigate to your existing project:

```bash
cd my-nextjs-app  # or any TypeScript/JavaScript project
bddai init
```

**What this creates:**
```
my-project/
├── bddai/
│   ├── project.md              # Auto-detected conventions
│   ├── features/               # Will contain .feature files
│   ├── scenarios/              # Will contain scenario .md files
│   └── .gitignore
├── requirements/
│   └── user-authentication.prd # Example PRD
├── .cursorrules                # Cursor AI rules (if --adapter cursor or both)
└── .claude/
    └── mcp-setup.md           # MCP setup instructions (if --adapter claude-code or both)
```

**Options:**
```bash
# Initialize with specific adapter
bddai init --adapter claude-code  # Only Claude Code
bddai init --adapter cursor       # Only Cursor
bddai init --adapter both         # Both (default)

# Force reinitialize
bddai init --force
```

### Step 2: Review Generated Files

**`bddai/project.md`** - Auto-detected project conventions:
- Framework (Next.js, React, Express, etc.)
- File structure patterns
- Naming conventions
- Code templates
- Tech stack

**Review and customize** if needed:
```bash
vim bddai/project.md
```

## IDE Setup

### Setup for Claude Code (MCP Integration)

#### 1. Find Your MCP Configuration File

Location varies by OS:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

#### 2. Add BDD-AI MCP Server

Edit the config file and add:

```json
{
  "mcpServers": {
    "bddai": {
      "command": "npx",
      "args": ["bddai-mcp-server"],
      "cwd": "/absolute/path/to/your/project"
    }
  }
}
```

**Important**: Replace `/absolute/path/to/your/project` with your actual project path!

#### 3. Restart Claude Code

Close and reopen Claude Code for changes to take effect.

#### 4. Verify MCP Tools

In Claude Code, the AI should now have access to:
- `list_features` - List all available features
- `read_scenario` - Read a feature's Gherkin scenarios
- `read_conventions` - Read project.md conventions
- `list_scenarios` - List scenarios for a feature
- `read_scenario_detail` - Read detailed scenario markdown

**Test it:**
```
You (in Claude Code): What features are available?
Claude: [Uses list_features MCP tool automatically]
```

### Setup for Cursor

Cursor setup is automatic! The `bddai init` command created `.cursorrules` which Cursor automatically reads.

#### Verify Cursor Integration

1. Open your project in Cursor
2. Check that `.cursorrules` exists
3. Ask Cursor: "What BDD scenarios are available?"
4. Cursor should read from `bddai/` directory automatically

#### Manual .cursorrules (if needed)

If `.cursorrules` wasn't created, run:
```bash
bddai init --adapter cursor --force
```

## Usage Workflow

### 1. Add Your Product Requirements

Create a PRD in `requirements/`:

```bash
vim requirements/my-feature.prd
```

Example PRD structure:
```markdown
# User Authentication

## Overview
User authentication system with email/password and JWT tokens.

## User Stories

### As a user
I want to login with email and password
So that I can access protected resources

**Acceptance Criteria:**
- User submits email and password
- System validates credentials
- Returns JWT token on success
- Token expires in 24 hours
- Failed attempts are rate limited
```

### 2. Generate BDD Scenarios

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
```

### 3. Review Generated Scenarios

Check what was created:
```bash
# View feature files (Gherkin)
cat bddai/features/user-authentication.feature

# View detailed scenarios
ls bddai/scenarios/user-authentication/

# View analysis report
cat bddai/analysis-report.md
```

### 4. Start Coding with Grounded AI

#### In Claude Code:
```
You: Implement user login feature

Claude: [Automatically uses MCP tools]
- Reads scenario from bddai/features/user-authentication.feature
- Reads conventions from bddai/project.md
- Generates code matching YOUR requirements and patterns
- NO HALLUCINATION!
```

#### In Cursor:
```
You: Implement user login

Cursor: [Follows .cursorrules]
- Reads bddai/features/user-authentication.feature
- Reads bddai/project.md
- Generates grounded code
```

## Troubleshooting

### BDD-AI CLI Not Found

```bash
# Check if linked
bddai --version

# If not found, link again
cd /path/to/bddai-pair/packages/cli
pnpm link --global

# Or add to PATH
export PATH="$PATH:/path/to/bddai-pair/packages/cli/dist"
```

### MCP Tools Not Available (Claude Code)

**Symptoms**: Claude Code doesn't have `list_features` or other MCP tools

**Solutions**:

1. **Check config path**: Ensure you edited the correct config file for your OS

2. **Check config syntax**: JSON must be valid
   ```bash
   # Validate JSON (macOS/Linux)
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq .
   ```

3. **Check project path**: Must be absolute path
   ```json
   {
     "cwd": "/Users/you/projects/my-app"  // ✅ Absolute
     // NOT: "./my-app" ❌ Relative
   }
   ```

4. **Restart Claude Code completely**: Close all windows, quit application

5. **Check MCP server package**: Ensure it's built
   ```bash
   cd /path/to/bddai-pair/packages/adapters/claude-code
   pnpm build
   ```

### Cursor Not Reading .cursorrules

**Symptoms**: Cursor generates generic code, doesn't mention scenarios

**Solutions**:

1. **Check file exists**:
   ```bash
   ls -la .cursorrules
   ```

2. **Recreate file**:
   ```bash
   bddai init --adapter cursor --force
   ```

3. **Restart Cursor**: Close and reopen

4. **Explicitly mention scenarios** in your prompts:
   ```
   "Implement user login following the scenario in bddai/features/user-authentication.feature"
   ```

### No Scenarios Generated

**Symptoms**: `bddai requirements analyze` runs but creates no scenarios

**Solutions**:

1. **Check PRD format**: Ensure PRD has clear acceptance criteria

2. **Run with verbose**:
   ```bash
   bddai requirements analyze --verbose
   ```

3. **Check PRD location**: Must be in `requirements/` directory

4. **Try example PRD**: Use the auto-generated example
   ```bash
   bddai requirements analyze user-authentication
   ```

### "Package not found" Errors

**Symptoms**: Import errors when running bddai

**Solutions**:

1. **Rebuild all packages**:
   ```bash
   cd /path/to/bddai-pair
   pnpm clean
   pnpm install
   pnpm build
   ```

2. **Check workspace links**:
   ```bash
   pnpm list --depth 0
   ```

3. **Relink CLI**:
   ```bash
   cd packages/cli
   pnpm unlink --global
   pnpm link --global
   ```

## Verification

### Verify Complete Setup

Run this checklist:

```bash
# 1. CLI installed
bddai --version

# 2. Project initialized
ls bddai/project.md

# 3. MCP config (Claude Code)
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | grep bddai

# 4. Cursor rules (Cursor)
ls .cursorrules

# 5. Requirements directory
ls requirements/

# 6. Try generating scenarios
bddai requirements analyze

# 7. Check generated files
ls bddai/features/
ls bddai/scenarios/
```

### Verify MCP Tools (Claude Code)

In Claude Code, ask:
```
You: Can you list the available features?
```

Claude should respond with MCP tool usage showing features from your `bddai/features/` directory.

### Verify Cursor Integration

In Cursor, ask:
```
You: What project conventions should you follow?
```

Cursor should mention reading `bddai/project.md` or describe your project's detected framework.

## Next Steps

Once installed and verified:

1. **Read the workflow guide**: See `WORKFLOW.md` for complete usage examples
2. **Review generated scenarios**: Check `bddai/features/` and `bddai/scenarios/`
3. **Start coding**: Ask AI to implement features using the scenarios
4. **Report issues**: https://github.com/jamalcodez/bddai-pair/issues

## Updating BDD-AI

### From Source

```bash
cd /path/to/bddai-pair
git pull
pnpm install
pnpm build
```

### From NPM (when published)

```bash
npm update -g @bddai/cli
# or
pnpm update -g @bddai/cli
```

## Uninstallation

```bash
# Unlink global CLI
pnpm unlink --global @bddai/cli

# Remove from project
rm -rf bddai/
rm .cursorrules
rm -rf .claude/

# Remove from Claude Code config
# Edit config file and remove "bddai" entry

# Remove source (if cloned)
rm -rf /path/to/bddai-pair
```

## Support

- **Documentation**: See `README.md` and `WORKFLOW.md`
- **Issues**: https://github.com/jamalcodez/bddai-pair/issues
- **Discussions**: https://github.com/jamalcodez/bddai-pair/discussions
