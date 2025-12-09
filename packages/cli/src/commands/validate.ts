import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ScenarioManager } from '@bddai/core';

import { readFileSync } from 'fs';
import { join } from 'path';

interface ProjectConfig {
  featuresDirectory?: string;
  defaultFramework?: string;
  [key: string]: any;
}

export class ValidateCommand extends Command {
  constructor() {
    super('validate');
    this.description('Validate project and features');
    this.option('-s, --strict', 'Strict validation mode');
    this.option('-f, --feature <feature>', 'Validate specific feature');
    this.action(this.execute.bind(this));
  }

  private async execute(options?: any) {
    const spinner = ora('Validating project...').start();

    try {
      // Load config
      const configPath = join(process.cwd(), '.bddai', 'config.json');
      const config: ProjectConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

      // Initialize scenario manager
      const scenarioManager = new ScenarioManager(config as any);
      await scenarioManager.initialize();

      // Validate
      if (options?.feature) {
        // Validate specific feature
        const features = scenarioManager.getAllFeatures();
        const feature = features.find(f =>
          f.feature?.name.toLowerCase().includes(options.feature.toLowerCase())
        );

        if (!feature) {
          throw new Error(`Feature "${options.feature}" not found`);
        }

        const result = await scenarioManager.validateFeature(feature.uri);

        spinner.succeed(chalk.green('Validation completed'));

        if (result.valid) {
          console.log(chalk.green(`✓ Feature "${feature.feature?.name}" is valid`));
        } else {
          console.log(chalk.red(`✗ Feature "${feature.feature?.name}" has issues:`));
          result.errors.forEach(error => {
            console.log(chalk.red(`  - ${error}`));
          });
        }

        if (result.warnings.length > 0) {
          console.log(chalk.yellow('\nWarnings:'));
          result.warnings.forEach(warning => {
            console.log(chalk.yellow(`  - ${warning}`));
          });
        }

      } else {
        // Validate all features
        const features = scenarioManager.getAllFeatures();
        let totalErrors = 0;
        let totalWarnings = 0;

        spinner.text = 'Validating features...';

        for (const featureDoc of features) {
          if (featureDoc.feature) {
            const result = await scenarioManager.validateFeature(featureDoc.uri);
            totalErrors += result.errors.length;
            totalWarnings += result.warnings.length;

            if (!result.valid) {
              console.log(chalk.red(`\n✗ ${featureDoc.feature.name}`));
              result.errors.forEach(error => {
                console.log(chalk.red(`  - ${error}`));
              });
            }
          }
        }

        spinner.succeed(chalk.green('Validation completed'));

        console.log(`\nValidation Summary:`);
        console.log(`  Features: ${features.length}`);
        console.log(`  ${chalk.red(`Errors: ${totalErrors}`)}`);
        console.log(`  ${chalk.yellow(`Warnings: ${totalWarnings}`)}`);

        if (options?.strict && totalErrors > 0) {
          process.exit(1);
        }
      }

    } catch (error) {
      spinner.fail(chalk.red('Validation failed'));
      console.error(error);
      if (options?.strict) {
        process.exit(1);
      }
    }
  }
}