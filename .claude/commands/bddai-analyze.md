# Analyze PRD and generate BDD features

You are helping analyze requirements and generate grounded BDD scenarios.

## Check Project Status

First, check if this is a BDD-AI project:
- Look for `bddai/project.md` (new markdown-based approach)
- Or look for `.bddai/config.json` (legacy approach)

## If BDD-AI is initialized (bddai/ exists):

1. **Find PRD files** in `requirements/` directory
2. **Run analysis**: `bddai requirements analyze`
3. **Review generated files**:
   - `bddai/features/*.feature` - Gherkin scenarios
   - `bddai/scenarios/*/` - Detailed scenario markdown
   - `bddai/project.md` - Project conventions
   - `bddai/analysis-report.md` - Analysis summary

4. **Explain to user**:
   - How many features were generated
   - How many scenarios per feature
   - Where to find the scenarios
   - How AI will use these for grounded code generation

## If NOT initialized:

1. **Suggest initialization**: `bddai init`
2. **Explain what it does**:
   - Creates `bddai/` directory with project.md
   - Auto-detects framework (Next.js, React, Express, etc.)
   - Generates project conventions and patterns
   - Sets up IDE integrations (MCP for Claude Code, .cursorrules for Cursor)

3. **Guide through workflow**:
   - Add PRD to `requirements/`
   - Run `bddai requirements analyze`
   - Review scenarios in `bddai/`
   - Start coding with grounded AI

## Key Points

- **All scenarios stored as markdown** in `bddai/`
- **AI reads scenarios** via MCP tools (read_scenario, read_conventions)
- **No hallucination** - AI grounded in actual requirements
- **Human-readable** - Review and edit scenarios as needed
