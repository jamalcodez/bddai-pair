import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'fs';
import { join, dirname } from 'path';

interface ProjectConfig {
  name: string;
  version: string;
  aiAdapters?: string[];
  [key: string]: any;
}

interface UpgradeResult {
  adapter: string;
  filesUpdated: string[];
  filesBackedUp: string[];
  errors: string[];
}

export class UpgradeCommand extends Command {
  constructor() {
    super('upgrade');
    this.description('Upgrade bddai adapter integrations in existing project');
    this.option('--adapter <adapter>', 'Specific adapter to upgrade (claude-code, cursor, all)', 'all');
    this.option('--dry-run', 'Show what would be updated without making changes');
    this.option('--backup', 'Create backups of existing files', true);
    this.option('--no-backup', 'Skip creating backups');
    this.option('-f, --force', 'Force upgrade without confirmation');
    this.action(this.execute.bind(this));
  }

  private async execute(options?: any) {
    const spinner = ora('Checking project...').start();

    try {
      // Check if this is a bddai project
      const projectRoot = process.cwd();
      const configPath = join(projectRoot, '.bddai', 'config.json');

      if (!existsSync(configPath)) {
        spinner.fail(chalk.red('Not a bddai project'));
        console.log(chalk.yellow('\nThis directory does not contain a .bddai/config.json file.'));
        console.log(chalk.cyan('Initialize a new project with: bddai init'));
        process.exit(1);
      }

      // Load project config
      const config: ProjectConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
      spinner.succeed(chalk.green(`Found bddai project: ${config.name}`));

      // Detect installed adapters
      const installedAdapters = this.detectInstalledAdapters(projectRoot);

      if (installedAdapters.length === 0) {
        console.log(chalk.yellow('\nNo adapter integrations found in this project.'));
        console.log(chalk.cyan('Run: bddai init --adapter <adapter> to add integrations'));
        process.exit(0);
      }

      console.log(chalk.bold('\n📦 Installed Adapters:'));
      installedAdapters.forEach(adapter => {
        console.log(chalk.cyan(`  ✓ ${adapter}`));
      });

      // Determine which adapters to upgrade
      let adaptersToUpgrade: string[] = [];
      const requestedAdapter = options?.adapter || 'all';

      if (requestedAdapter === 'all') {
        adaptersToUpgrade = installedAdapters;
      } else if (installedAdapters.includes(requestedAdapter)) {
        adaptersToUpgrade = [requestedAdapter];
      } else {
        console.log(chalk.red(`\nAdapter "${requestedAdapter}" is not installed in this project.`));
        console.log(chalk.cyan(`Installed adapters: ${installedAdapters.join(', ')}`));
        process.exit(1);
      }

      // Show what will be upgraded
      console.log(chalk.bold('\n🔄 Adapters to Upgrade:'));
      adaptersToUpgrade.forEach(adapter => {
        console.log(chalk.yellow(`  → ${adapter}`));
      });

      if (options?.dryRun) {
        console.log(chalk.blue('\n[DRY RUN MODE]'));
        await this.showUpgradePreview(projectRoot, adaptersToUpgrade);
        console.log(chalk.gray('\nNo changes were made. Remove --dry-run to apply updates.'));
        return;
      }

      // Confirm upgrade unless forced
      if (!options?.force) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Proceed with upgrade?',
            default: true,
          },
        ]);

        if (!confirm) {
          console.log(chalk.gray('Upgrade cancelled.'));
          process.exit(0);
        }
      }

      // Perform upgrades
      const results: UpgradeResult[] = [];

      for (const adapter of adaptersToUpgrade) {
        const result = await this.upgradeAdapter(projectRoot, adapter, options?.backup !== false);
        results.push(result);
      }

      // Display results
      console.log(chalk.bold('\n✨ Upgrade Complete!'));

      for (const result of results) {
        if (result.errors.length === 0) {
          console.log(chalk.green(`\n✓ ${result.adapter}:`));
          console.log(chalk.gray(`  Updated ${result.filesUpdated.length} file(s)`));
          if (result.filesBackedUp.length > 0) {
            console.log(chalk.gray(`  Backed up ${result.filesBackedUp.length} file(s)`));
          }
        } else {
          console.log(chalk.red(`\n✗ ${result.adapter}:`));
          result.errors.forEach(error => {
            console.log(chalk.red(`  ${error}`));
          });
        }
      }

      // Update config with upgraded adapters
      const updatedAdapters = config.aiAdapters || [];
      adaptersToUpgrade.forEach(adapter => {
        if (!updatedAdapters.includes(adapter)) {
          updatedAdapters.push(adapter);
        }
      });
      config.aiAdapters = updatedAdapters;
      writeFileSync(configPath, JSON.stringify(config, null, 2));

      console.log(chalk.cyan('\n💡 Tip: Restart your IDE to load the updated adapter files.'));

    } catch (error) {
      spinner.fail(chalk.red('Upgrade failed'));
      console.error(error);
      process.exit(1);
    }
  }

  private detectInstalledAdapters(projectRoot: string): string[] {
    const adapters: string[] = [];

    // Check for Claude Code
    const claudeCommandsDir = join(projectRoot, '.claude', 'commands');
    if (existsSync(claudeCommandsDir)) {
      const files = readdirSync(claudeCommandsDir);
      const hasBddaiCommands = files.some(f => f.startsWith('bddai-') && f.endsWith('.md'));
      if (hasBddaiCommands) {
        adapters.push('claude-code');
      }
    }

    // Check for Cursor
    const cursorRules = join(projectRoot, '.cursorrules');
    const cursorDir = join(projectRoot, '.cursor');
    if (existsSync(cursorRules) || existsSync(cursorDir)) {
      // Verify it's a bddai cursor integration
      if (existsSync(cursorRules)) {
        const content = readFileSync(cursorRules, 'utf-8');
        if (content.includes('BDD-AI Pair')) {
          adapters.push('cursor');
        }
      } else if (existsSync(join(cursorDir, 'bddai-context.md'))) {
        adapters.push('cursor');
      }
    }

    return adapters;
  }

  private async showUpgradePreview(projectRoot: string, adapters: string[]): Promise<void> {
    console.log(chalk.bold('\n📋 Files that would be updated:\n'));

    for (const adapter of adapters) {
      console.log(chalk.yellow(`${adapter}:`));

      if (adapter === 'claude-code') {
        const claudeCommands = [
          '.claude/commands/bddai-analyze.md',
          '.claude/commands/bddai-pair.md',
          '.claude/commands/bddai-review.md',
          '.claude/commands/bddai-test.md',
          '.claude/commands/bddai-status.md',
          '.claude/commands/bddai-init-project.md',
        ];
        claudeCommands.forEach(file => {
          const exists = existsSync(join(projectRoot, file));
          const status = exists ? chalk.blue('[UPDATE]') : chalk.green('[CREATE]');
          console.log(`  ${status} ${file}`);
        });
      }

      if (adapter === 'cursor') {
        const cursorFiles = [
          '.cursorrules',
          '.cursor/composer-rules.md',
          '.cursor/bddai-context.md',
        ];
        cursorFiles.forEach(file => {
          const exists = existsSync(join(projectRoot, file));
          const status = exists ? chalk.blue('[UPDATE]') : chalk.green('[CREATE]');
          console.log(`  ${status} ${file}`);
        });
      }

      console.log('');
    }
  }

  private async upgradeAdapter(projectRoot: string, adapter: string, createBackup: boolean): Promise<UpgradeResult> {
    const result: UpgradeResult = {
      adapter,
      filesUpdated: [],
      filesBackedUp: [],
      errors: [],
    };

    try {
      if (adapter === 'claude-code') {
        await this.upgradeClaudeCode(projectRoot, createBackup, result);
      } else if (adapter === 'cursor') {
        await this.upgradeCursor(projectRoot, createBackup, result);
      }
    } catch (error) {
      result.errors.push(`Failed to upgrade ${adapter}: ${error}`);
    }

    return result;
  }

  private async upgradeClaudeCode(projectRoot: string, createBackup: boolean, result: UpgradeResult): Promise<void> {
    const commandsDir = join(projectRoot, '.claude', 'commands');

    // Ensure directory exists
    if (!existsSync(commandsDir)) {
      mkdirSync(commandsDir, { recursive: true });
    }

    // Create backup if requested
    if (createBackup && existsSync(commandsDir)) {
      const backupDir = join(projectRoot, '.bddai', 'backups', `claude-code-${Date.now()}`);
      mkdirSync(backupDir, { recursive: true });

      const files = readdirSync(commandsDir);
      files.forEach(file => {
        if (file.startsWith('bddai-') && file.endsWith('.md')) {
          copyFileSync(join(commandsDir, file), join(backupDir, file));
          result.filesBackedUp.push(`.claude/commands/${file}`);
        }
      });
    }

    // Import and use ClaudeCodeAdapter to regenerate commands
    const { ClaudeCodeAdapter } = await import('@bddai/claude-code-adapter');
    const adapter = new ClaudeCodeAdapter({
      projectRoot,
      verbose: false,
    });

    const initResult = await adapter.initialize();
    result.filesUpdated.push(...initResult.commandsCreated.map(cmd => `.claude/commands/${cmd}.md`));

    if (initResult.errors && initResult.errors.length > 0) {
      result.errors.push(...initResult.errors);
    }
  }

  private async upgradeCursor(projectRoot: string, createBackup: boolean, result: UpgradeResult): Promise<void> {
    // Create backup if requested
    if (createBackup) {
      const backupDir = join(projectRoot, '.bddai', 'backups', `cursor-${Date.now()}`);
      mkdirSync(backupDir, { recursive: true });

      const filesToBackup = [
        '.cursorrules',
        '.cursor/composer-rules.md',
        '.cursor/bddai-context.md',
      ];

      filesToBackup.forEach(file => {
        const filePath = join(projectRoot, file);
        if (existsSync(filePath)) {
          const backupPath = join(backupDir, file);
          mkdirSync(dirname(backupPath), { recursive: true });
          copyFileSync(filePath, backupPath);
          result.filesBackedUp.push(file);
        }
      });
    }

    // Import and use CursorAdapter to regenerate files
    const { CursorAdapter } = await import('@bddai/cursor-adapter');
    const adapter = new CursorAdapter({
      projectRoot,
      verbose: false,
    });

    const initResult = await adapter.initialize();
    result.filesUpdated.push(...initResult.filesCreated);

    if (initResult.errors && initResult.errors.length > 0) {
      result.errors.push(...initResult.errors);
    }
  }
}
