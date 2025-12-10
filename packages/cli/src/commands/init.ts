import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ProjectInitializer } from '@bddai/core';

export class InitCommand extends Command {
  constructor() {
    super('init');
    this.description('Initialize BDD-AI in current project');
    this.option('-f, --force', 'Force initialization even if bddai/ exists');
    this.option('--adapter <adapter>', 'AI IDE adapter to use (claude-code, cursor, both)', 'both');
    this.action(this.execute.bind(this));
  }

  private async execute(options?: any) {
    const spinner = ora('Initializing BDD-AI...').start();
    const projectDir = process.cwd();

    try {
      // Check if already initialized
      if (existsSync(join(projectDir, 'bddai')) && !options?.force) {
        spinner.fail(chalk.red('BDD-AI already initialized (bddai/ directory exists)'));
        console.log(chalk.yellow('\nUse --force to reinitialize'));
        process.exit(1);
      }

      // Initialize bddai/ directory with ProjectInitializer
      spinner.text = 'Creating bddai/ directory with project conventions...';
      const initializer = new ProjectInitializer();
      await initializer.initialize(projectDir);

      // Create requirements/ directory
      spinner.text = 'Creating requirements/ directory...';
      mkdirSync(join(projectDir, 'requirements'), { recursive: true });

      // Create example PRD
      spinner.text = 'Creating example PRD...';
      await this.createExamplePRD(projectDir);

      // Setup IDE adapters
      const adapter = options?.adapter || 'both';
      if (adapter === 'claude-code' || adapter === 'both') {
        spinner.text = 'Setting up Claude Code integration...';
        await this.setupClaudeCode(projectDir);
      }

      if (adapter === 'cursor' || adapter === 'both') {
        spinner.text = 'Setting up Cursor integration...';
        await this.setupCursor(projectDir);
      }

      spinner.succeed(chalk.green('BDD-AI initialized successfully!'));

      // Show what was created
      console.log(chalk.bold('\n📁 Created:'));
      console.log(chalk.gray('  ✓ bddai/project.md - Project conventions and patterns'));
      console.log(chalk.gray('  ✓ bddai/features/ - Feature files directory'));
      console.log(chalk.gray('  ✓ bddai/scenarios/ - Scenario files directory'));
      console.log(chalk.gray('  ✓ requirements/ - PRD files directory'));
      console.log(chalk.gray('  ✓ requirements/user-authentication.prd - Example PRD'));

      if (adapter === 'claude-code' || adapter === 'both') {
        console.log(chalk.gray('  ✓ Claude Code MCP server configuration'));
        console.log(chalk.bold('\n🔧 Claude Code Setup:'));
        console.log(chalk.cyan('  Add to your Claude Code MCP settings:'));
        console.log(chalk.gray('  {'));
        console.log(chalk.gray('    "bddai": {'));
        console.log(chalk.gray('      "command": "npx",'));
        console.log(chalk.gray('      "args": ["bddai-mcp-server"],'));
        console.log(chalk.gray(`      "cwd": "${projectDir}"`));
        console.log(chalk.gray('    }'));
        console.log(chalk.gray('  }'));
      }

      if (adapter === 'cursor' || adapter === 'both') {
        console.log(chalk.gray('  ✓ .cursorrules - Cursor AI behavior rules'));
        console.log(chalk.bold('\n🎯 Cursor Setup:'));
        console.log(chalk.cyan('  Cursor will automatically use .cursorrules'));
        console.log(chalk.cyan('  AI will read scenarios from bddai/ before coding'));
      }

      console.log(chalk.bold('\n📝 Next Steps:'));
      console.log(chalk.cyan('  1. Review bddai/project.md (auto-detected conventions)'));
      console.log(chalk.cyan('  2. Add your PRD to requirements/'));
      console.log(chalk.cyan('  3. Run: bddai requirements analyze'));
      console.log(chalk.cyan('  4. Review generated features in bddai/features/'));
      console.log(chalk.cyan('  5. Start coding with AI using the scenarios!'));

      console.log(chalk.bold('\n💡 How It Works:'));
      console.log(chalk.gray('  • PRD → Scenarios: bddai breaks down requirements into BDD scenarios'));
      console.log(chalk.gray('  • AI reads scenarios from bddai/ before generating code'));
      console.log(chalk.gray('  • No hallucination - AI is grounded in your actual requirements'));
      console.log(chalk.gray('  • Human-readable markdown files you can review and edit'));

    } catch (error) {
      spinner.fail(chalk.red('Failed to initialize BDD-AI'));
      console.error(error);
      process.exit(1);
    }
  }

  private async createExamplePRD(projectDir: string) {
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

    writeFileSync(join(projectDir, 'requirements', 'user-authentication.prd'), examplePRD);
  }

  private async setupClaudeCode(projectDir: string) {
    // Create a simple MCP config helper file
    const mcpConfigExample = `# Claude Code MCP Configuration

Add this to your Claude Code MCP settings (usually in ~/.config/claude-code/mcp.json or similar):

\`\`\`json
{
  "bddai": {
    "command": "npx",
    "args": ["bddai-mcp-server"],
    "cwd": "${projectDir}"
  }
}
\`\`\`

The MCP server provides these tools to Claude Code:
- read_scenario: Read a BDD scenario to implement
- read_conventions: Read project conventions from project.md
- list_features: List all available features
- read_scenario_detail: Read detailed scenario with implementation status

Claude Code will automatically use these tools to ground its responses in your actual requirements.
`;

    mkdirSync(join(projectDir, '.claude'), { recursive: true });
    writeFileSync(join(projectDir, '.claude', 'mcp-setup.md'), mcpConfigExample);
  }

  private async setupCursor(projectDir: string) {
    // Use the CursorIntegration class
    const { CursorIntegration } = await import('@bddai/cursor-adapter');
    const integration = new CursorIntegration(projectDir);
    await integration.install();
  }
}