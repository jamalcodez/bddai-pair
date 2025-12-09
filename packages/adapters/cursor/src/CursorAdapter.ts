import { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { CursorAdapterConfig, AdapterInitResult } from './types.js';

/**
 * Cursor Adapter for BDD-AI Pair
 *
 * Integrates bddai framework with Cursor IDE by:
 * - Creating .cursorrules for bddai operations
 * - Providing context to Cursor AI about BDD scenarios
 * - Managing agent communication through Cursor interface
 * - Setting up Composer rules for BDD workflow
 */
export class CursorAdapter {
  private config: CursorAdapterConfig;
  private rulesFile: string;

  constructor(config: CursorAdapterConfig) {
    this.config = config;
    this.rulesFile = config.rulesFile || join(config.projectRoot, '.cursorrules');
  }

  /**
   * Initialize the adapter and create Cursor integration files
   */
  async initialize(): Promise<AdapterInitResult> {
    const result: AdapterInitResult = {
      success: true,
      filesCreated: [],
      errors: [],
    };

    try {
      // Create .cursorrules file
      await this.createCursorRules();
      result.filesCreated.push('.cursorrules');

      // Create .cursor directory for additional config
      const cursorDir = join(this.config.projectRoot, '.cursor');
      if (!existsSync(cursorDir)) {
        mkdirSync(cursorDir, { recursive: true });
      }

      // Create composer rules file
      await this.createComposerRules();
      result.filesCreated.push('.cursor/composer-rules.md');

      // Create bddai context file for Cursor
      await this.createContextFile();
      result.filesCreated.push('.cursor/bddai-context.md');

      if (this.config.verbose) {
        console.log(`Cursor adapter initialized with ${result.filesCreated.length} files`);
      }

    } catch (error) {
      result.success = false;
      result.errors?.push(`Initialization failed: ${error}`);
    }

    return result;
  }

  /**
   * Create .cursorrules file with BDD-AI Pair integration
   */
  private async createCursorRules(): Promise<void> {
    const rules = `# BDD-AI Pair Project

This project uses BDD-AI Pair framework for behavior-driven development with AI pair programming.

## Project Structure

- \`.bddai/\` - BDD-AI configuration
- \`requirements/\` - Product Requirements Documents (PRDs)
- \`features/\` - Gherkin feature files with BDD scenarios
- \`tests/\` - Test implementations
- \`docs/\` - Generated documentation

## Core Principles

1. **Requirements First**: Start with PRD documents in \`requirements/\`
2. **Scenarios as Specification**: BDD scenarios define the contract
3. **Test-Driven**: Implement code to make scenarios pass
4. **AI Pair Programming**: Use AI agents (Driver, Navigator, Reviewer) collaboratively

## Available Commands

When working with this project, you can use these bddai CLI commands:

- \`bddai init\` - Initialize new BDD-AI project
- \`bddai requirements analyze\` - Generate features from PRDs
- \`bddai feature list\` - List all features
- \`bddai feature create <name>\` - Create new feature
- \`bddai feature review <name>\` - Review generated scenarios
- \`bddai feature approve <name>\` - Approve feature for implementation
- \`bddai pair start <feature>\` - Start AI pair programming session
- \`bddai test\` - Run BDD tests
- \`bddai validate\` - Validate scenarios

## Workflow Guidelines

### 1. Analyzing Requirements
When asked to analyze requirements or create features:
- Check \`requirements/\` for PRD files
- Run \`bddai requirements analyze\` to generate feature files
- Review generated scenarios in \`features/\` directory
- Verify scenarios cover all acceptance criteria
- Suggest improvements if scenarios are incomplete

### 2. Reviewing Scenarios
When reviewing BDD scenarios:
- Each scenario should test ONE behavior
- Use Given/When/Then structure consistently
- Steps should be reusable across scenarios
- Language should be from user's perspective
- Check for missing edge cases and error handling

### 3. Implementing Features
When implementing a feature:
- Start by reading the feature file in \`features/\`
- Understand each scenario's Given/When/Then steps
- Implement step definitions if they don't exist
- Write code to make scenarios pass
- Run \`bddai test\` frequently to verify progress
- Follow TDD: Red → Green → Refactor

### 4. Pair Programming Mode
When in pair programming mode:
- Act as either Driver (writes code) or Navigator (reviews)
- Reference scenario requirements before coding
- Discuss trade-offs and design decisions
- Keep implementation aligned with scenarios
- Update scenarios if requirements change

## Context Awareness

Before responding to requests:
1. Check if \`.bddai/config.json\` exists (project initialized?)
2. Check \`requirements/\` for PRD files
3. Check \`features/\` for generated scenarios
4. Determine project state and suggest appropriate next steps

## Best Practices

- **Never skip scenarios**: They are the specification and tests
- **Keep scenarios focused**: One behavior per scenario
- **Make scenarios readable**: They document the system
- **Update scenarios when requirements change**
- **Run tests frequently**: Ensure implementation matches scenarios
- **Document assumptions**: Add comments for non-obvious decisions

## Example Interaction

User: "Implement user authentication"

Your Response:
1. Check if feature file exists: \`features/user-authentication.feature\`
2. If not, check for PRD: \`requirements/user-authentication.prd\`
3. If PRD exists: Run \`bddai requirements analyze\`
4. Review generated scenarios with user
5. Once approved: Implement following BDD scenarios
6. Run tests to verify implementation

Remember: In BDD-AI Pair, scenarios are the contract. Always reference them when coding.
`;

    writeFileSync(this.rulesFile, rules, 'utf-8');
  }

  /**
   * Create Composer rules for Cursor
   */
  private async createComposerRules(): Promise<void> {
    const composerRules = `# BDD-AI Pair Composer Rules

Use these rules when working with Cursor Composer in BDD-AI Pair projects.

## Quick Commands

Type these in Composer for common operations:

- \`@analyze-prd\` - Analyze PRD and generate features
- \`@review-scenarios\` - Review generated BDD scenarios
- \`@implement-feature\` - Start implementing a feature
- \`@run-tests\` - Run BDD tests and review results
- \`@check-status\` - Check project status
- \`@pair-session\` - Start pair programming session

## Composer Workflow

### Starting New Feature

1. User: \`@analyze-prd requirements/my-feature.prd\`
2. AI: Runs \`bddai requirements analyze\`
3. AI: Reviews generated scenarios, suggests improvements
4. User: Approves or requests changes
5. User: \`@implement-feature my-feature\`
6. AI: Reads scenarios, implements step by step
7. AI: Runs tests after each step

### Code Review

When reviewing code in Composer:
- Reference the feature file scenarios
- Check if implementation matches Given/When/Then steps
- Verify edge cases from scenarios are handled
- Suggest tests if scenarios are missing coverage

### Debugging

When debugging with Composer:
1. Read the failing scenario
2. Identify which step is failing
3. Review step definition implementation
4. Check actual vs expected behavior
5. Fix code to match scenario expectation

## Integration with Codebase

When Composer needs context:
- Always check \`.bddai/config.json\` first
- Reference \`features/*.feature\` for specifications
- Check \`requirements/*.prd\` for original requirements
- Look at existing step definitions for patterns

## Composer Best Practices

- Start conversations by checking project state
- Reference specific scenarios when discussing features
- Keep implementation aligned with BDD scenarios
- Run tests frequently in Composer workflow
- Update scenarios if requirements evolve
`;

    const composerPath = join(this.config.projectRoot, '.cursor', 'composer-rules.md');
    writeFileSync(composerPath, composerRules, 'utf-8');
  }

  /**
   * Create context file for Cursor to understand project structure
   */
  private async createContextFile(): Promise<void> {
    const contextContent = `# BDD-AI Pair Context

This file provides context for Cursor AI about the BDD-AI Pair project structure.

## What is BDD-AI Pair?

BDD-AI Pair is a framework that combines:
- Behavior-Driven Development (BDD) with Gherkin syntax
- AI-powered pair programming with specialized agents
- Requirements analysis and automatic scenario generation
- Test-driven development workflow

## Agent Roles

### Driver Agent
- Writes implementation code
- Follows scenarios as specification
- Makes technical decisions
- Implements step definitions

### Navigator Agent
- Reviews code quality
- Ensures alignment with scenarios
- Suggests improvements
- Watches for edge cases

### Reviewer Agent
- Reviews scenario quality
- Checks completeness
- Validates acceptance criteria coverage
- Suggests additional scenarios

### Analyzer Agent
- Parses PRD documents
- Extracts features and requirements
- Generates initial BDD scenarios
- Identifies dependencies

## Key Files and Directories

### Configuration
- \`.bddai/config.json\` - Project configuration
- \`.cursorrules\` - Cursor integration rules
- \`.cursor/\` - Cursor-specific files

### Requirements
- \`requirements/*.prd\` - Product Requirements Documents
- \`requirements/*.md\` - Markdown requirements

### Features
- \`features/*.feature\` - Gherkin feature files
- Contains scenarios with Given/When/Then steps
- These are your specification AND tests

### Tests
- Test framework configuration
- Step definitions implementation
- Test runners for different frameworks

### Documentation
- \`docs/\` - Generated documentation
- Feature documentation from scenarios
- API documentation

## Gherkin Syntax Reference

\`\`\`gherkin
Feature: User Authentication
  As a user
  I want to log in securely
  So that I can access my account

  Scenario: Successful login with valid credentials
    Given I am on the login page
    And I have a registered account with email "user@example.com"
    When I enter my email "user@example.com"
    And I enter my password "SecurePass123"
    And I click the "Login" button
    Then I should be redirected to the dashboard
    And I should see a welcome message "Welcome back!"

  Scenario: Login fails with invalid password
    Given I am on the login page
    And I have a registered account with email "user@example.com"
    When I enter my email "user@example.com"
    And I enter an incorrect password
    And I click the "Login" button
    Then I should see an error message "Invalid credentials"
    And I should remain on the login page
\`\`\`

## Development Workflow

1. **Analyze** - Convert PRDs to BDD scenarios
2. **Review** - Validate scenario quality and completeness
3. **Approve** - Mark scenarios ready for implementation
4. **Implement** - Write code following TDD with scenarios
5. **Test** - Verify implementation matches scenarios
6. **Refactor** - Improve code while keeping tests green

## Tips for Cursor AI

- Always check project initialization status first
- Reference specific scenario names when discussing features
- Read feature files before implementing
- Run tests after code changes
- Keep scenarios and code in sync
- Suggest scenario updates when requirements change
`;

    const contextPath = join(this.config.projectRoot, '.cursor', 'bddai-context.md');
    writeFileSync(contextPath, contextContent, 'utf-8');
  }

  /**
   * Check if project is initialized with bddai
   */
  isProjectInitialized(): boolean {
    const configPath = join(this.config.projectRoot, '.bddai', 'config.json');
    return existsSync(configPath);
  }

  /**
   * Get project configuration
   */
  getProjectConfig(): any {
    const configPath = join(this.config.projectRoot, '.bddai', 'config.json');
    if (!existsSync(configPath)) {
      return null;
    }
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * List available features in the project
   */
  listFeatures(): string[] {
    const config = this.getProjectConfig();
    if (!config) return [];

    const featuresDir = join(this.config.projectRoot, config.featuresDirectory || 'features');
    if (!existsSync(featuresDir)) return [];

    const { readdirSync } = require('fs');
    const files = readdirSync(featuresDir);

    return files
      .filter((file: string) => file.endsWith('.feature'))
      .map((file: string) => file.replace('.feature', ''));
  }

  /**
   * Add a custom rule to .cursorrules file
   */
  addCustomRule(ruleName: string, ruleContent: string): void {
    const customRule = `

## ${ruleName}

${ruleContent}
`;

    appendFileSync(this.rulesFile, customRule, 'utf-8');
  }

  /**
   * Update Cursor context with current project state
   */
  async updateContext(state: {
    currentFeature?: string;
    activeScenarios?: string[];
    testResults?: any;
  }): Promise<void> {
    const contextPath = join(this.config.projectRoot, '.cursor', 'current-state.json');
    const stateContent = JSON.stringify(state, null, 2);
    writeFileSync(contextPath, stateContent, 'utf-8');
  }
}
