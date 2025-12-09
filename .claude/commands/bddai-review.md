# Review generated BDD scenarios

You are reviewing BDD scenarios generated from requirements.

Steps:
1. Check for features in the features/ directory
2. For each feature file, analyze:
   - Are scenarios clear and testable?
   - Do they cover all acceptance criteria?
   - Are Given/When/Then steps well-defined?
   - Are there edge cases missing?
3. Suggest improvements to scenarios if needed
4. When approved, mark scenarios ready: bddai feature approve [feature-name]

Quality criteria:
- Scenarios should be independent and isolated
- Steps should be reusable across scenarios
- Each scenario should test one behavior
- Language should be from user's perspective
