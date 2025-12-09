#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import { InitCommand } from './commands/init.js';
import { FeatureCommand } from './commands/feature.js';
import { RequirementsCommand } from './commands/requirements.js';
import { PairCommand } from './commands/pair.js';
import { TestCommand } from './commands/test.js';
import { DocsCommand } from './commands/docs.js';
import { ValidateCommand } from './commands/validate.js';
import { UpgradeCommand } from './commands/upgrade.js';

const program = new Command();

// Display banner
console.log(
  chalk.cyan(
    figlet.textSync('BDD-AI Pair', {
      font: 'Standard',
      horizontalLayout: 'default',
      verticalLayout: 'default',
    })
  )
);
console.log(chalk.gray('Behavior-Driven Development with AI Pair Programming\n'));

program
  .name('bddai')
  .description('CLI for BDD-AI Pair framework')
  .version('0.1.0');

// Add commands
program.addCommand(new InitCommand());
program.addCommand(new UpgradeCommand());
program.addCommand(new RequirementsCommand());
program.addCommand(new FeatureCommand());
program.addCommand(new PairCommand());
program.addCommand(new TestCommand());
program.addCommand(new DocsCommand());
program.addCommand(new ValidateCommand());

// Parse arguments
program.parse();