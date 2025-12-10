# Check BDD-AI project status

You are checking the project status and suggesting next steps.

## Check and Report

### 1. Project Initialization Status
- Check for `bddai/project.md` (✅ initialized)
- OR check for `.bddai/config.json` (legacy)
- If neither exists: NOT initialized

### 2. MCP Server Status (if using Claude Code)
Use MCP tools to check:
- Try `list_features` - if it works, MCP is configured ✅
- If it fails, guide user to setup MCP server

### 3. Project Contents
Check filesystem:
- **PRD files**: Count files in `requirements/`
- **Generated features**: Count files in `bddai/features/`
- **Generated scenarios**: Count directories in `bddai/scenarios/`
- **Analysis report**: Check for `bddai/analysis-report.md`

### 4. Framework Detection
Read `bddai/project.md` if it exists:
- What framework was detected?
- Are conventions documented?

### 5. IDE Integration
- **Cursor**: Check for `.cursorrules` file
- **Claude Code**: Check for `.claude/mcp-setup.md`

## Suggest Next Steps

Based on status, suggest:

**If NOT initialized:**
→ Run `bddai init` to setup project

**If initialized but no PRDs:**
→ Add PRD to `requirements/` directory
→ Example PRD structure provided

**If PRDs exist but no scenarios:**
→ Run `bddai requirements analyze`
→ Review generated scenarios

**If scenarios exist:**
→ Start implementing with grounded AI
→ For Cursor: AI will auto-read `.cursorrules`
→ For Claude Code: Use MCP tools (read_scenario, read_conventions)

**If MCP not working:**
→ Guide through MCP server setup (show `.claude/mcp-setup.md`)

## Report Format

Present status as:
```
📊 BDD-AI Project Status

✅ Initialized: Yes (bddai/ directory exists)
✅ Framework: Next.js (detected)
✅ MCP Server: Configured

📁 Content:
  • PRD files: 2
  • Features: 3
  • Scenarios: 12

🔧 IDE Integration:
  ✅ Cursor (.cursorrules)
  ✅ Claude Code (MCP)

💡 Next Step: Start implementing! Use /bddai-pair command
```
