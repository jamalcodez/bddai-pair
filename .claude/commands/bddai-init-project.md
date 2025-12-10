# Initialize BDD-AI in existing project

You are helping initialize BDD-AI's grounding system in an existing project.

## Step 1: Check if Already Initialized

Look for:
- `bddai/project.md` (✅ new markdown approach)
- OR `.bddai/config.json` (legacy approach)

If exists: "BDD-AI already initialized!"

## Step 2: Run Initialization

If NOT initialized, run:
```bash
bddai init
```

## Step 3: Explain What Was Created

```
✅ Created bddai/ directory structure:

bddai/
├── project.md       # Auto-detected project conventions
├── features/        # Will contain Gherkin scenarios
└── scenarios/       # Will contain detailed scenario markdown

requirements/        # Add your PRD files here
└── user-authentication.prd  # Example PRD created

.cursorrules        # Cursor AI behavior (if using Cursor)

.claude/
└── mcp-setup.md   # MCP server instructions (if using Claude Code)
```

## Step 4: Explain Auto-Detection

BDD-AI detected:
- **Framework**: Next.js / React / Express / etc.
- **File Structure**: From your existing code
- **Naming Conventions**: From your package.json and code
- **Code Patterns**: Framework-specific patterns

All saved in `bddai/project.md` for AI to read!

## Step 5: Explain the Workflow

### For Users (Human Workflow):
1. **Add PRD** to `requirements/my-feature.prd`
2. **Analyze**: `bddai requirements analyze`
3. **Review scenarios** in `bddai/features/` and `bddai/scenarios/`
4. **Start coding** with AI (Cursor or Claude Code)

### For AI (Grounded Coding):
1. **Read scenario**: Use MCP tool `read_scenario("feature-name")`
2. **Read conventions**: Use MCP tool `read_conventions()`
3. **Generate code** matching BOTH requirements AND conventions
4. **No hallucination** - grounded in actual files!

## Step 6: MCP Setup (Claude Code Only)

If user uses Claude Code, show MCP setup:

```json
// Add to Claude Code MCP settings:
{
  "bddai": {
    "command": "npx",
    "args": ["bddai-mcp-server"],
    "cwd": "/path/to/this/project"
  }
}
```

After setup, you'll have MCP tools:
- `list_features` - List all features
- `read_scenario` - Read a feature's scenarios
- `read_conventions` - Read project.md
- `list_scenarios` - List scenarios for a feature
- `read_scenario_detail` - Read detailed scenario markdown

## Step 7: Offer to Create First PRD

Ask: "Would you like help creating your first PRD?"

If yes, guide them through:
- **Feature name**: What are you building?
- **User stories**: Who needs it and why?
- **Acceptance criteria**: What defines "done"?
- **Edge cases**: What could go wrong?

Then save to `requirements/{feature-name}.prd`

## Key Benefits

**Prevents AI Hallucination by:**
- ✅ AI reads ACTUAL requirements from markdown
- ✅ AI uses YOUR conventions from project.md
- ✅ No inventing features or file paths
- ✅ Human-readable, reviewable scenarios
- ✅ Git-friendly versioning
