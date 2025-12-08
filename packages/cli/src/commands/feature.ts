import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { ScenarioManager, ScenarioParser } from '@bddai/core';
import { ProjectConfig } from '@bddai/types';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export class FeatureCommand extends Command {
  private scenarioManager?: ScenarioManager;

  constructor() {
    super('feature');
    this.description('Manage features (AI-generated)');
    this.addCommand(new FeatureListCommand());
    this.addCommand(new FeatureReviewCommand());
    this.addCommand(new FeatureApproveCommand());
    this.addCommand(new FeatureCreateCommand());
    this.addCommand(new FeatureAddScenarioCommand());
  }

  async initScenarioManager() {
    if (!this.scenarioManager) {
      // Load config
      const configPath = join(process.cwd(), '.bddai', 'config.json');
      const config: ProjectConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

      // Initialize scenario manager
      this.scenarioManager = new ScenarioManager(config);
      await this.scenarioManager.initialize();
    }
    return this.scenarioManager;
  }
}

class FeatureCreateCommand extends Command {
  constructor() {
    super('create');
    this.description('Create a new feature');
    this.argument('<name>', 'Name of the feature');
    this.option('-d, --description <description>', 'Feature description');
    this.option('-t, --tags <tags>', 'Feature tags (comma-separated)');
    this.action(this.execute.bind(this));
  }

  private async execute(name: string, options?: any) {
    const spinner = ora('Creating feature...').start();

    try {
      const parentCommand = this.parent as FeatureCommand;
      const scenarioManager = await parentCommand.initScenarioManager();

      // Parse tags
      const tags = options?.tags ? options.tags.split(',').map((t: string) => t.trim()) : [];

      // Create feature
      const feature = await scenarioManager.createFeature(name, options?.description, tags);

      spinner.succeed(chalk.green(`Feature "${name}" created successfully`));
      console.log(chalk.gray(`  Location: features/${name.toLowerCase().replace(/\s+/g, '-')}.feature`));

    } catch (error) {
      spinner.fail(chalk.red('Failed to create feature'));
      console.error(error);
      process.exit(1);
    }
  }
}

class FeatureListCommand extends Command {
  constructor() {
    super('list');
    this.description('List all features');
    this.option('-s, --status <status>', 'Filter by status');
    this.action(this.execute.bind(this));
  }

  private async execute(options?: any) {
    try {
      const parentCommand = this.parent as FeatureCommand;
      const scenarioManager = await parentCommand.initScenarioManager();

      const metadata = scenarioManager.getFeaturesMetadata();

      if (metadata.length === 0) {
        console.log(chalk.yellow('No features found'));
        return;
      }

      console.log(chalk.bold('Features:'));
      console.log('');

      metadata.forEach(feature => {
        const statusColor = feature.status === 'completed' ? chalk.green :
                          feature.status === 'in-progress' ? chalk.yellow :
                          chalk.gray;

        console.log(`${chalk.cyan(feature.name)} (${statusColor(feature.status)})`);
        console.log(`  Path: ${feature.path}`);
        console.log(`  Scenarios: ${feature.scenarios}`);
        if (feature.tags.length > 0) {
          console.log(`  Tags: ${feature.tags.map(t => chalk.gray(`@${t}`)).join(' ')}`);
        }
        console.log('');
      });

    } catch (error) {
      console.error(chalk.red('Failed to list features'));
      console.error(error);
      process.exit(1);
    }
  }
}

class FeatureAddScenarioCommand extends Command {
  constructor() {
    super('add-scenario');
    this.description('Add a scenario to an existing feature');
    this.argument('<feature>', 'Feature name');
    this.argument('<scenario>', 'Scenario name');
    this.option('-s, --steps <steps>', 'Steps for the scenario (JSON format)');
    this.action(this.execute.bind(this));
  }

  private async execute(featureName: string, scenarioName: string, options?: any) {
    try {
      const parentCommand = this.parent as FeatureCommand;
      const scenarioManager = await parentCommand.initScenarioManager();

      let steps;
      if (options?.steps) {
        steps = JSON.parse(options.steps);
      } else {
        // Interactive step creation
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'description',
            message: 'Scenario description (optional):',
          },
          {
            type: 'confirm',
            name: 'addSteps',
            message: 'Add steps now?',
            default: true,
          },
        ]);

        steps = [];
        if (answers.addSteps) {
          let addingSteps = true;
          while (addingSteps) {
            const stepAnswers = await inquirer.prompt([
              {
                type: 'list',
                name: 'keyword',
                message: 'Step type:',
                choices: ['Given', 'When', 'Then', 'And', 'But'],
              },
              {
                type: 'input',
                name: 'text',
                message: 'Step text:',
              },
              {
                type: 'confirm',
                name: 'addMore',
                message: 'Add another step?',
                default: true,
              },
            ]);

            steps.push({
              keyword: stepAnswers.keyword,
              text: stepAnswers.text,
            });

            addingSteps = stepAnswers.addMore;
          }
        }
      }

      // Find feature file
      const features = scenarioManager.getAllFeatures();
      const feature = features.find(f =>
        f.feature?.name.toLowerCase() === featureName.toLowerCase() ||
        f.feature?.name.toLowerCase().includes(featureName.toLowerCase())
      );

      if (!feature) {
        console.error(chalk.red(`Feature "${featureName}" not found`));
        process.exit(1);
      }

      // Add scenario
      await scenarioManager.addScenario(feature.uri, scenarioName, steps);

      console.log(chalk.green(`\nScenario "${scenarioName}" added to feature "${featureName}"`));

    } catch (error) {
      console.error(chalk.red('Failed to add scenario'));
      console.error(error);
      process.exit(1);
    }
  }
}

class FeatureReviewCommand extends Command {
  constructor() {
    super('review');
    this.description('Review AI-generated scenarios');
    this.argument('<feature>', 'Feature name or file');
    this.option('-i, --interactive', 'Interactive review mode');
    this.action(this.execute.bind(this));
  }

  private async execute(featureName: string, options?: any) {
    try {
      // Find feature file
      const featuresDir = join(process.cwd(), 'features');
      const parser = new ScenarioParser();

      let featurePath: string;
      if (existsSync(featureName)) {
        featurePath = featureName;
      } else {
        // Find feature by name
        const fs = await import('fs/promises');
        const files = await fs.readdir(featuresDir);
        const featureFile = files.find(f =>
          f.toLowerCase().includes(featureName.toLowerCase())
        );

        if (!featureFile) {
          throw new Error(`Feature "${featureName}" not found`);
        }

        featurePath = join(featuresDir, featureFile);
      }

      // Parse feature
      const document = await parser.parseFeature(featurePath);
      const feature = document.feature;

      if (!feature) {
        throw new Error('No feature found in file');
      }

      // Display feature information
      console.log(chalk.bold(`\n📋 Feature: ${feature.name}`));
      if (feature.description) {
        console.log(chalk.gray(feature.description));
      }

      console.log(chalk.bold(`\n📝 Scenarios (${feature.scenarios.length}):`));

      // Display scenarios
      for (let i = 0; i < feature.scenarios.length; i++) {
        const scenario = feature.scenarios[i];
        const tags = scenario.tags?.map(t => t.name) || [];
        const tagStr = tags.length > 0 ? ` ${chalk.cyan(tags.join(' '))}` : '';

        console.log(`\n${i + 1}. ${chalk.yellow(scenario.name)}${tagStr}`);

        if (scenario.description) {
          console.log(chalk.gray(`   ${scenario.description}`));
        }

        console.log(chalk.gray('   Steps:'));
        scenario.steps.forEach(step => {
          console.log(chalk.gray(`     ${step.keyword} ${step.text}`));
        });
      }

      // Interactive review
      if (options?.interactive) {
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
              { name: 'Approve all scenarios', value: 'approve' },
              { name: 'Edit scenarios', value: 'edit' },
              { name: 'Add more scenarios', value: 'add' },
              { name: 'Regenerate scenarios', value: 'regenerate' },
              { name: 'Just review', value: 'review' },
            ],
          },
        ]);

        switch (action) {
          case 'approve':
            // Create approval marker file
            const approvalPath = featurePath.replace('.feature', '.approved');
            writeFileSync(approvalPath, new Date().toISOString());
            console.log(chalk.green('\n✅ Feature approved for implementation!'));
            break;
          case 'edit':
            console.log(chalk.cyan('\n📝 Edit the feature file directly:'));
            console.log(chalk.gray(featurePath));
            break;
          case 'add':
            console.log(chalk.cyan('\n➕ Use: bddai feature add-scenario <feature>'));
            break;
          case 'regenerate':
            console.log(chalk.cyan('\n🔄 Use: bddai requirements analyze'));
            break;
        }
      }

    } catch (error) {
      console.error(chalk.red('Failed to review feature'));
      console.error(error);
      process.exit(1);
    }
  }
}

class FeatureApproveCommand extends Command {
  constructor() {
    super('approve');
    this.description('Approve scenarios for implementation');
    this.argument('<feature>', 'Feature name');
    this.option('-c, --comment <comment>', 'Approval comment');
    this.action(this.execute.bind(this));
  }

  private async execute(featureName: string, options?: any) {
    try {
      const featuresDir = join(process.cwd(), 'features');
      const fs = await import('fs/promises');
      const files = await fs.readdir(featuresDir);
      const featureFile = files.find(f =>
        f.toLowerCase().includes(featureName.toLowerCase())
      );

      if (!featureFile) {
        throw new Error(`Feature "${featureName}" not found`);
      }

      const featurePath = join(featuresDir, featureFile);
      const approvalPath = featurePath.replace('.feature', '.approved');

      // Create approval file with metadata
      const approvalData = {
        approvedAt: new Date().toISOString(),
        approvedBy: process.env.USER || 'user',
        comment: options?.comment || 'Approved for implementation',
        featureFile,
      };

      writeFileSync(approvalPath, JSON.stringify(approvalData, null, 2));

      console.log(chalk.green(`\n✅ Feature "${featureName}" approved!`));
      console.log(chalk.gray(`  Approval file: ${approvalPath}`));
      console.log(chalk.cyan('\nNext steps:'));
      console.log(chalk.cyan('  bddai pair start ' + featureName));

    } catch (error) {
      console.error(chalk.red('Failed to approve feature'));
      console.error(error);
      process.exit(1);
    }
  }
}