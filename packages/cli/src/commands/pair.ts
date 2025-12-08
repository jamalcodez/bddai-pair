import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { AgentOrchestrator } from '@bddai/core';
import { ScenarioManager } from '@bddai/core';
import { ProjectConfig } from '@bddai/types';
import { readFileSync } from 'fs';
import { join } from 'path';

export class PairCommand extends Command {
  constructor() {
    super('pair');
    this.description('AI pair programming commands');
    this.addCommand(new PairStartCommand());
    this.addCommand(new PairStatusCommand());
    this.addCommand(new PairSwitchCommand());
  }
}

class PairStartCommand extends Command {
  constructor() {
    super('start');
    this.description('Start AI pair programming for a feature');
    this.argument('<feature>', 'Feature name');
    this.option('-a, --adapter <adapter>', 'AI adapter to use (claude-code, cursor)');
    this.action(this.execute.bind(this));
  }

  private async execute(featureName: string, options?: any) {
    const spinner = ora('Starting AI pair programming...').start();

    try {
      // Load config
      const configPath = join(process.cwd(), '.bddai', 'config.json');
      const config: ProjectConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

      // Initialize scenario manager
      const scenarioManager = new ScenarioManager(config);
      await scenarioManager.initialize();

      // Initialize orchestrator
      const orchestrator = new AgentOrchestrator();
      await orchestrator.initialize();

      // Find feature and scenario
      const features = scenarioManager.getAllFeatures();
      const feature = features.find(f =>
        f.feature?.name.toLowerCase().includes(featureName.toLowerCase())
      );

      if (!feature?.feature) {
        throw new Error(`Feature "${featureName}" not found`);
      }

      // Get first scenario (or let user choose)
      const scenario = feature.feature.scenarios[0];
      if (!scenario) {
        throw new Error(`No scenarios found in feature "${featureName}"`);
      }

      // Create session
      const session = await orchestrator.createSession(scenario.name);

      // Start the session
      await orchestrator.startSession(session.id, feature.feature, scenario);

      spinner.succeed(chalk.green(`AI pair programming started for "${scenario.name}"`));
      console.log('\nSession ID:', session.id);
      console.log('\nThe AI agents are now collaborating on implementing this feature.');
      console.log('Use "bddai pair status" to check progress.');

      // Set up event listeners
      session.on('humanMessage', (data) => {
        console.log(chalk.cyan('\n🤖 AI Agent:'), data.message.payload.answer);
      });

      session.on('sessionCompleted', (data) => {
        console.log(chalk.green('\n✅ Session completed!'));
        console.log('Duration:', `${data.duration}ms`);
      });

      // Keep process alive
      process.on('SIGINT', async () => {
        await orchestrator.endSession(session.id);
        process.exit(0);
      });

    } catch (error) {
      spinner.fail(chalk.red('Failed to start pair programming'));
      console.error(error);
      process.exit(1);
    }
  }
}

class PairStatusCommand extends Command {
  constructor() {
    super('status');
    this.description('Show status of active pair programming sessions');
    this.action(this.execute.bind(this));
  }

  private async execute() {
    try {
      const orchestrator = new AgentOrchestrator();
      await orchestrator.initialize();

      const sessions = orchestrator.getAllSessions();
      const stats = orchestrator.getStatistics();

      console.log(chalk.bold('Active Sessions:'));
      console.log('');

      if (sessions.length === 0) {
        console.log(chalk.yellow('No active sessions'));
        return;
      }

      sessions.forEach(session => {
        const statusColor = session.status === 'active' ? chalk.green :
                          session.status === 'paused' ? chalk.yellow :
                          session.status === 'completed' ? chalk.blue :
                          chalk.red;

        console.log(`${chalk.cyan(session.id)} (${statusColor(session.status)})`);
        console.log(`  Scenario: ${session.scenario}`);
        console.log(`  Messages: ${session.messages.length}`);
        console.log(`  Duration: ${Date.now() - session.createdAt.getTime()}ms`);
        console.log('');
      });

      console.log(chalk.bold('Statistics:'));
      console.log(`  Total sessions: ${stats.sessions.total}`);
      console.log(`  Active: ${stats.sessions.active}`);
      console.log(`  Completed: ${stats.sessions.completed}`);

    } catch (error) {
      console.error(chalk.red('Failed to get status'));
      console.error(error);
      process.exit(1);
    }
  }
}

class PairSwitchCommand extends Command {
  constructor() {
    super('switch');
    this.description('Switch driver/navigator roles in a session');
    this.argument('<session-id>', 'Session ID');
    this.action(this.execute.bind(this));
  }

  private async execute(sessionId: string) {
    const spinner = ora('Switching roles...').start();

    try {
      const orchestrator = new AgentOrchestrator();
      await orchestrator.initialize();

      await orchestrator.switchRoles(sessionId);

      spinner.succeed(chalk.green('Roles switched successfully'));

    } catch (error) {
      spinner.fail(chalk.red('Failed to switch roles'));
      console.error(error);
      process.exit(1);
    }
  }
}