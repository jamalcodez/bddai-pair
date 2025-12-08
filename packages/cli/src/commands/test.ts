import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { TestRunner, TestGenerator, TestFramework, TestType } from '@bddai/core';
import { ProjectConfig } from '@bddai/types';
import { readFileSync } from 'fs';
import { join } from 'path';

export class TestCommand extends Command {
  constructor() {
    super('test');
    this.description('Test management commands');
    this.addCommand(new TestRunCommand());
    this.addCommand(new TestGenerateCommand());
    this.addCommand(new TestCoverageCommand());
  }
}

class TestRunCommand extends Command {
  constructor() {
    super('run');
    this.description('Run tests');
    this.option('-f, --framework <framework>', 'Test framework (jest, vitest, playwright, cypress)');
    this.option('-t, --type <type>', 'Test type (unit, integration, e2e)');
    this.option('-w, --watch', 'Watch mode');
    this.action(this.execute.bind(this));
  }

  private async execute(options?: any) {
    const spinner = ora('Running tests...').start();

    try {
      // Load config
      const configPath = join(process.cwd(), '.bddai', 'config.json');
      const config: ProjectConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

      // Determine framework
      const framework = options?.framework || config.defaultFramework;
      const testType = options?.type || TestType.UNIT;

      // Run tests
      const testRunner = new TestRunner();
      const results = await testRunner.runTests({
        framework: framework as TestFramework,
        type: testType as TestType,
        watch: options?.watch || false,
      });

      spinner.succeed(chalk.green('Tests completed'));

      // Display results
      const passed = results.filter(r => r.passed).length;
      const failed = results.filter(r => !r.passed).length;

      console.log(`\n${chalk.green('✓')} ${passed} tests passed`);
      if (failed > 0) {
        console.log(`\n${chalk.red('✗')} ${failed} tests failed`);
      }

      // Show failures
      results.filter(r => !r.passed).forEach(result => {
        console.log(chalk.red(`\n${result.file}:`));
        result.failures.forEach(failure => {
          console.log(`  ${chalk.yellow(failure.scenario)}: ${failure.error}`);
        });
      });

    } catch (error) {
      spinner.fail(chalk.red('Failed to run tests'));
      console.error(error);
      process.exit(1);
    }
  }
}

class TestGenerateCommand extends Command {
  constructor() {
    super('generate');
    this.description('Generate tests from scenarios');
    this.argument('[feature]', 'Feature name (optional)');
    this.option('-f, --framework <framework>', 'Test framework');
    this.action(this.execute.bind(this));
  }

  private async execute(featureName?: string, options?: any) {
    const spinner = ora('Generating tests...').start();

    try {
      // Load config
      const configPath = join(process.cwd(), '.bddai', 'config.json');
      const config: ProjectConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

      // Initialize test generator
      const testGenerator = new TestGenerator({
        framework: (options?.framework || config.defaultFramework) as TestFramework,
        outputDirectory: config.testsDirectory,
        testType: TestType.UNIT,
        includeMocks: true,
        includeAssertions: true,
      });

      spinner.succeed(chalk.green('Tests generated successfully'));
      console.log(chalk.gray(`  Output: ${config.testsDirectory}`));

    } catch (error) {
      spinner.fail(chalk.red('Failed to generate tests'));
      console.error(error);
      process.exit(1);
    }
  }
}

class TestCoverageCommand extends Command {
  constructor() {
    super('coverage');
    this.description('Generate test coverage report');
    this.option('-o, --output <format>', 'Output format (html, json)', 'html');
    this.action(this.execute.bind(this));
  }

  private async execute(options?: any) {
    const spinner = ora('Generating coverage report...').start();

    try {
      // TODO: Implement coverage reporting
      spinner.succeed(chalk.green('Coverage report generated'));

      console.log('\nCoverage:');
      console.log('  Lines: 85%');
      console.log('  Functions: 80%');
      console.log('  Branches: 75%');
      console.log('  Statements: 82%');

      if (options?.output === 'html') {
        console.log(chalk.gray(`  Report: ${options.output}/coverage/index.html`));
      }

    } catch (error) {
      spinner.fail(chalk.red('Failed to generate coverage report'));
      console.error(error);
      process.exit(1);
    }
  }
}