import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

interface ProjectConfig {
  name: string;
  version: string;
  description: string;
  featuresDirectory: string;
  stepsDirectory: string;
  testsDirectory: string;
  docsDirectory: string;
  defaultFramework: string;
  language: string;
  aiAdapters: string[];
  autoGenerate: any;
  git: any;
}

export class InitCommand extends Command {
  constructor() {
    super('init');
    this.description('Initialize a new BDD-AI Pair project');
    this.argument('[project-name]', 'Name of the project');
    this.option('-t, --template <template>', 'Template to use', 'basic');
    this.option('-f, --force', 'Force initialization even if directory exists');
    this.option('--adapter <adapter>', 'AI IDE adapter to use (claude-code, cursor, both)', 'both');
    this.action(this.execute.bind(this));
  }

  private async execute(projectName?: string, options?: any) {
    const spinner = ora('Initializing project...').start();

    try {
      // Get project details if not provided
      if (!projectName) {
        spinner.stop();
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Project name:',
            default: 'my-bdd-project',
          },
          {
            type: 'input',
            name: 'description',
            message: 'Project description:',
          },
        ]);
        projectName = answers.name;
        spinner.start();
      }

      // Check if directory exists
      if (existsSync(projectName!) && !options?.force) {
        spinner.fail(chalk.red(`Directory ${projectName} already exists`));
        process.exit(1);
      }

      // Create project directory
      const projectDir = join(process.cwd(), projectName!);
      mkdirSync(projectDir, { recursive: true });

      // Create basic structure
      await this.createProjectStructure(projectDir, projectName!, options?.adapter || 'both');

      // Create configuration
      await this.createConfig(projectDir, projectName!, options?.adapter || 'both');

      spinner.succeed(chalk.green(`Project ${projectName} initialized successfully!`));
      console.log('\nCreated:');
      console.log(chalk.gray('  ✓ Project structure (features/, requirements/, tests/)'));
      console.log(chalk.gray('  ✓ Configuration (.bddai/config.json)'));

      const adapter = options?.adapter || 'both';
      if (adapter === 'claude-code' || adapter === 'both') {
        console.log(chalk.gray('  ✓ Claude Code commands (.claude/commands/)'));
        console.log('\nClaude Code commands available:');
        console.log(chalk.cyan('  /bddai-analyze    - Analyze PRD and generate features'));
        console.log(chalk.cyan('  /bddai-pair       - Start AI pair programming'));
        console.log(chalk.cyan('  /bddai-review     - Review BDD scenarios'));
        console.log(chalk.cyan('  /bddai-test       - Run tests'));
        console.log(chalk.cyan('  /bddai-status     - Check project status'));
      }

      if (adapter === 'cursor' || adapter === 'both') {
        console.log(chalk.gray('  ✓ Cursor integration (.cursorrules, .cursor/)'));
        console.log('\nCursor integration available:');
        console.log(chalk.cyan('  .cursorrules      - Cursor AI rules for BDD workflow'));
        console.log(chalk.cyan('  .cursor/          - Composer rules and context files'));
      }

      console.log(chalk.gray('  ✓ Example PRD and feature files'));
      console.log('\nNext steps:');
      console.log(chalk.cyan(`  cd ${projectName}`));
      console.log(chalk.cyan('  bddai requirements analyze'));
      console.log(chalk.cyan('  bddai feature review user-authentication'));
      console.log(chalk.cyan('  bddai feature approve user-authentication'));
      console.log(chalk.cyan('  bddai pair start user-authentication'));

    } catch (error) {
      spinner.fail(chalk.red('Failed to initialize project'));
      console.error(error);
      process.exit(1);
    }
  }

  private async createProjectStructure(projectDir: string, projectName: string, adapter: string = 'both') {
    const baseDirectories = [
      'features',
      'requirements',
      'src/steps',
      'tests/unit',
      'tests/integration',
      'tests/e2e',
      'docs/features',
      '.bddai',
    ];

    const directories = [...baseDirectories];

    // Add adapter-specific directories
    if (adapter === 'claude-code' || adapter === 'both') {
      directories.push('.claude/commands');
    }
    if (adapter === 'cursor' || adapter === 'both') {
      directories.push('.cursor');
    }

    for (const dir of directories) {
      mkdirSync(join(projectDir, dir), { recursive: true });
    }

    // Create example PRD
    const examplePRD = `# User Authentication PRD

## Overview
This document outlines the requirements for the user authentication system.

## User Stories

### As a user
I want to authenticate with my credentials
So that I can access my protected resources

**Acceptance Criteria:**
- Users can register with email and password
- Users can login with valid credentials
- Users receive a JWT token upon successful login
- Tokens expire after 24 hours
- Passwords must be at least 8 characters
- Email validation is required
- Login attempts are rate limited

## Features

### User Registration
- New users can register with email and password
- Password strength validation
- Email verification required
- Duplicate email prevention

### User Login
- Users authenticate with email/password
- JWT token generation
- Session management
- Remember me functionality
- Account lockout after failed attempts

### Password Recovery
- Users can reset forgotten passwords
- Email-based password reset
- Secure token-based flow
- Token expiration handling

## Non-Functional Requirements

### Security
- Password hashing (bcrypt)
- Rate limiting on auth endpoints
- CSRF protection
- HTTPS enforcement

### Performance
- Login response time < 500ms
- Support concurrent users
- Efficient session storage

### Data Privacy
- GDPR compliance
- Data encryption at rest
- Secure password storage
- Audit logging for auth events
`;

    writeFileSync(join(projectDir, 'requirements/user-authentication.prd'), examplePRD);

    // Create example feature (for direct feature creation)
    const exampleFeature = `Feature: User Authentication
  As a user
  I want to authenticate with my credentials
  So that I can access my protected resources

  Scenario: Successful login
    Given a user exists with email "user@example.com" and password "ValidPass123!"
    When the user submits login request with valid credentials
    Then the system should return a JWT token
    And the token should be valid for 24 hours
`;

    writeFileSync(join(projectDir, 'features/user-authentication.feature'), exampleFeature);

    // Create IDE adapter integrations
    if (adapter === 'claude-code' || adapter === 'both') {
      await this.createClaudeCommands(projectDir);
    }
    if (adapter === 'cursor' || adapter === 'both') {
      await this.createCursorIntegration(projectDir);
    }
  }

  private async createClaudeCommands(projectDir: string) {
    const commands = [
      {
        name: 'bddai-analyze',
        description: 'Analyze PRD and generate BDD features',
        content: `You are helping with BDD-AI Pair development.

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

Remember: All development should be driven by BDD scenarios first.`,
      },
      {
        name: 'bddai-pair',
        description: 'Start AI pair programming session for a feature',
        content: `You are starting an AI pair programming session using BDD-AI Pair.

Steps:
1. Check that .bddai/config.json exists
2. List available features using: bddai feature list
3. Ask the user which feature to implement
4. Review the feature scenarios to understand requirements
5. Start implementation following the scenarios as tests
6. Run: bddai test to verify implementation matches scenarios

Remember: The scenarios are your specification and tests. Implement code that makes the scenarios pass.`,
      },
      {
        name: 'bddai-review',
        description: 'Review generated BDD scenarios',
        content: `You are reviewing BDD scenarios generated from requirements.

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
- Language should be from user's perspective`,
      },
      {
        name: 'bddai-test',
        description: 'Run BDD tests and check implementation',
        content: `You are running BDD tests to verify implementation.

Steps:
1. Run: bddai test
2. Review test results:
   - Which scenarios are passing?
   - Which are failing and why?
   - Are step definitions implemented?
3. If tests fail:
   - Read the scenario requirements
   - Check the implementation
   - Fix code to match scenario expectations
4. Report results to the user

Remember: Tests failing means implementation doesn't match the scenario requirements yet.`,
      },
      {
        name: 'bddai-status',
        description: 'Check project status and next steps',
        content: `You are checking the BDD-AI Pair project status.

Check and report:
1. Is this a bddai project? (check .bddai/config.json)
2. How many PRD files in requirements/?
3. How many features generated in features/?
4. How many features approved vs pending review?
5. Test status (if implemented)
6. Active pair programming sessions

Then suggest appropriate next steps based on current state.`,
      },
      {
        name: 'bddai-init-project',
        description: 'Initialize a new BDD-AI Pair project',
        content: `You are initializing a new BDD-AI Pair project.

Steps:
1. Check if already initialized (look for .bddai/config.json)
2. If not initialized:
   - Run: bddai init
   - Explain the created directory structure
   - Show the example PRD and feature files
3. Explain the workflow:
   - Add PRDs to requirements/
   - Run bddai requirements analyze
   - Review and approve features
   - Start pair programming with bddai pair start
4. Offer to help create their first PRD

Remember: BDD-AI Pair works best when you start with requirements, not code.`,
      },
    ];

    for (const command of commands) {
      const commandContent = `# ${command.description}

${command.content}
`;
      writeFileSync(join(projectDir, '.claude', 'commands', `${command.name}.md`), commandContent);
    }
  }

  private async createCursorIntegration(projectDir: string) {
    // Import CursorAdapter
    const { CursorAdapter } = await import('@bddai/cursor-adapter');

    // Initialize adapter
    const adapter = new CursorAdapter({
      projectRoot: projectDir,
      verbose: false,
    });

    // Create Cursor integration files
    await adapter.initialize();
  }

  private async createConfig(projectDir: string, projectName: string, adapter: string = 'both') {
    // Determine which adapters to include in config
    let aiAdapters: string[] = [];
    if (adapter === 'both') {
      aiAdapters = ['claude-code', 'cursor'];
    } else if (adapter === 'claude-code') {
      aiAdapters = ['claude-code'];
    } else if (adapter === 'cursor') {
      aiAdapters = ['cursor'];
    }

    const config: ProjectConfig = {
      name: projectName,
      version: '1.0.0',
      description: `${projectName} - BDD-AI Pair project`,
      featuresDirectory: 'features',
      stepsDirectory: 'src/steps',
      testsDirectory: 'tests',
      docsDirectory: 'docs',
      defaultFramework: 'jest',
      language: 'typescript',
      aiAdapters,
      autoGenerate: {
        steps: true,
        tests: true,
        docs: true,
      },
      git: {
        hooks: {
          preCommit: true,
          prePush: false,
        },
      },
    };

    writeFileSync(
      join(projectDir, '.bddai', 'config.json'),
      JSON.stringify(config, null, 2)
    );
  }
}