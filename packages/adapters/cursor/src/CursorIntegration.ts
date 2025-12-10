import fs from 'fs/promises';
import path from 'path';

/**
 * Cursor integration - provides .cursorrules and helper scripts
 */
export class CursorIntegration {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Install Cursor integration
   */
  async install() {
    console.log('📦 Installing BDD-AI for Cursor...');

    // 1. Create .cursorrules
    await this.createCursorRules();

    // 2. Ensure bddai directory exists
    const bddaiDir = path.join(this.projectRoot, 'bddai');
    await fs.mkdir(bddaiDir, { recursive: true });

    console.log('✅ BDD-AI installed for Cursor');
    console.log('\nUsage in Cursor:');
    console.log('  1. Cursor will automatically follow the rules in .cursorrules');
    console.log('  2. Ask: "Implement the user-authentication feature"');
    console.log('  3. Cursor will read from bddai/features/ and bddai/project.md');
    console.log('  4. Generated code will match your project conventions');
  }

  /**
   * Create .cursorrules with BDD-AI grounding instructions
   */
  private async createCursorRules() {
    const cursorRulesPath = path.join(this.projectRoot, '.cursorrules');

    const rules = `# BDD-AI Grounding Rules for Cursor

## CRITICAL: Always Ground Your Responses in BDD Scenarios

When implementing features, you MUST follow this process:

### 1. Read the BDD Scenario First

Before generating ANY code, read the relevant scenario:

\`\`\`
File location: bddai/features/{feature-name}.feature
\`\`\`

Example:
- For "user authentication", read \`bddai/features/user-authentication.feature\`
- For "payment processing", read \`bddai/features/payment-processing.feature\`

### 2. Read Project Conventions

ALWAYS read the project conventions before implementing:

\`\`\`
File location: bddai/project.md
\`\`\`

This file contains:
- File structure patterns
- Naming conventions
- Code templates to follow
- Tech stack information

### 3. Implementation Process

When user asks to implement a feature:

**Step 1:** Read the feature file
\`\`\`
Read: bddai/features/{feature-name}.feature
\`\`\`

**Step 2:** Read project conventions
\`\`\`
Read: bddai/project.md
\`\`\`

**Step 3:** Check for scenario details
\`\`\`
Read: bddai/scenarios/{feature-name}/*.md
\`\`\`

**Step 4:** Generate code that:
- ✅ Implements all scenario steps
- ✅ Follows file structure from project.md
- ✅ Matches naming conventions from project.md
- ✅ Uses code patterns from project.md
- ✅ Follows tech stack conventions

### 4. File Structure Compliance

NEVER invent file paths. ALWAYS use the structure defined in \`bddai/project.md\`.

Example from project.md:
\`\`\`
src/
  ├── controllers/
  ├── services/
  └── repositories/
\`\`\`

Then your generated files MUST be:
- Controllers: \`src/controllers/{Feature}Controller.ts\`
- Services: \`src/services/{Feature}Service.ts\`
- Repositories: \`src/repositories/{Feature}Repository.ts\`

### 5. Naming Convention Compliance

Read the naming conventions from \`bddai/project.md\` and follow them EXACTLY.

If project.md says:
- "Controllers: PascalCase with 'Controller' suffix"

Then use:
- ✅ \`UserAuthController.ts\`
- ❌ NOT \`user_auth_controller.ts\`
- ❌ NOT \`userAuthController.ts\`

### 6. Code Pattern Compliance

Use the EXACT code patterns from \`bddai/project.md\`.

If project.md shows a controller pattern:
\`\`\`typescript
export class {Feature}Controller {
  constructor(private service: {Feature}Service) {}

  async handleRequest(req: Request, res: Response) {
    try {
      const result = await this.service.execute(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
\`\`\`

Then your generated controller MUST match this pattern.

## Error Prevention

### NEVER:
- ❌ Invent file paths not defined in project.md
- ❌ Use naming conventions different from project.md
- ❌ Generate code without reading the scenario first
- ❌ Ignore the patterns in project.md
- ❌ Create imports to files that don't exist

### ALWAYS:
- ✅ Read bddai/features/{feature}.feature first
- ✅ Read bddai/project.md for conventions
- ✅ Follow the file structure exactly
- ✅ Match the naming conventions
- ✅ Use the code patterns as templates
- ✅ Implement all scenario steps

## Example Workflow

**User:** "Implement user login"

**Your Process:**

1. **Read scenario:**
   \`\`\`
   Reading: bddai/features/user-authentication.feature

   Found scenario:
   Scenario: Successful login
     Given a registered user exists
     When the user submits valid credentials
     Then the user should be logged in
     And a JWT token should be generated
   \`\`\`

2. **Read conventions:**
   \`\`\`
   Reading: bddai/project.md

   File structure: src/controllers/, src/services/, src/repositories/
   Naming: PascalCase with suffix
   Pattern: [controller pattern from project.md]
   \`\`\`

3. **Generate code:**
   \`\`\`typescript
   // src/controllers/AuthController.ts
   // (Following exact pattern from project.md)

   export class AuthController {
     constructor(private authService: AuthService) {}

     async login(req: Request, res: Response) {
       try {
         // Implements: "user submits valid credentials"
         const { email, password } = req.body;

         // Implements: "user should be logged in"
         // Implements: "JWT token should be generated"
         const result = await this.authService.login(email, password);

         res.json({ success: true, data: result });
       } catch (error) {
         res.status(500).json({ success: false, error: error.message });
       }
     }
   }
   \`\`\`

4. **Explain:**
   - ✅ Read scenario from bddai/features/user-authentication.feature
   - ✅ Followed file structure from project.md (src/controllers/)
   - ✅ Used naming convention (AuthController)
   - ✅ Matched code pattern from project.md
   - ✅ Implemented all scenario steps

## Quick Reference

\`\`\`
Feature files:     bddai/features/*.feature
Scenario details:  bddai/scenarios/{feature}/*.md
Conventions:       bddai/project.md
\`\`\`

---

**Remember:** The scenarios are the specification. The project.md is the style guide. ALWAYS read both before generating code.
`;

    await fs.writeFile(cursorRulesPath, rules);
    console.log('   Created .cursorrules');
  }
}
