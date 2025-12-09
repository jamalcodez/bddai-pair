import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { ClaudeCodeAdapterConfig, ClaudeCommand, AdapterInitResult } from './types.js';

/**
 * Claude Code Adapter for BDD-AI Pair
 *
 * Integrates bddai framework with Claude Code by:
 * - Creating .claude/commands for bddai operations
 * - Providing context to Claude Code about BDD scenarios
 * - Managing agent communication through Claude Code interface
 */
export class ClaudeCodeAdapter {
  private config: ClaudeCodeAdapterConfig;
  private commandsDir: string;

  constructor(config: ClaudeCodeAdapterConfig) {
    this.config = config;
    this.commandsDir = config.commandsDir || join(config.projectRoot, '.claude', 'commands');
  }

  /**
   * Initialize the adapter and create Claude Code commands
   */
  async initialize(): Promise<AdapterInitResult> {
    const result: AdapterInitResult = {
      success: true,
      commandsCreated: [],
      errors: [],
    };

    try {
      // Ensure .claude/commands directory exists
      if (!existsSync(this.commandsDir)) {
        mkdirSync(this.commandsDir, { recursive: true });
      }

      // Create bddai commands for Claude Code
      const commands = this.getBDDAICommands();

      for (const command of commands) {
        try {
          await this.createCommand(command);
          result.commandsCreated.push(command.name);
        } catch (error) {
          result.errors?.push(`Failed to create command ${command.name}: ${error}`);
          result.success = false;
        }
      }

      if (this.config.verbose) {
        console.log(`Claude Code adapter initialized with ${result.commandsCreated.length} commands`);
      }

    } catch (error) {
      result.success = false;
      result.errors?.push(`Initialization failed: ${error}`);
    }

    return result;
  }

  /**
   * Get all bddai commands to be created in Claude Code
   */
  private getBDDAICommands(): ClaudeCommand[] {
    return [
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
  }

  /**
   * Create a Claude Code command file
   */
  private async createCommand(command: ClaudeCommand): Promise<void> {
    const commandPath = join(this.commandsDir, `${command.name}.md`);

    const commandContent = `# ${command.description}

${command.content}
`;

    writeFileSync(commandPath, commandContent, 'utf-8');
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
}
