import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ProjectConfig } from '@bddai/types';

export class InitCommand extends Command {
  constructor() {
    super('init');
    this.description('Initialize a new BDD-AI Pair project');
    this.argument('[project-name]', 'Name of the project');
    this.option('-t, --template <template>', 'Template to use', 'basic');
    this.option('-f, --force', 'Force initialization even if directory exists');
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
      await this.createProjectStructure(projectDir, projectName!);

      // Create configuration
      await this.createConfig(projectDir, projectName!);

      spinner.succeed(chalk.green(`Project ${projectName} initialized successfully!`));
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

  private async createProjectStructure(projectDir: string, projectName: string) {
    const directories = [
      'features',
      'requirements',
      'src/steps',
      'tests/unit',
      'tests/integration',
      'tests/e2e',
      'docs/features',
      '.bddai',
    ];

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
  }

  private async createConfig(projectDir: string, projectName: string) {
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
      aiAdapters: ['claude-code', 'cursor'],
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