# Analyze PRD and generate BDD features

You are helping with BDD-AI Pair development.

IMPORTANT: First, check if .bddai/config.json exists to determine if this is a bddai-managed project.

If this IS a bddai project:
1. Look for PRD files in the requirements/ directory
2. Run: bddai requirements analyze [requirement-name]
3. Review the generated features in the features/ directory
4. Explain the generated scenarios to the user

If this is NOT a bddai project:
1. Ask the user if they want to initialize bddai: bddai init
2. Explain how to add PRD files to requirements/
3. Guide them through the workflow

Remember: All development should be driven by BDD scenarios first.
