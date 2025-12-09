import { Command } from 'commander';

interface ProjectConfig {
  featuresDirectory?: string;
  [key: string]: any;
}

// Stub type - TODO: Import from @bddai/core when available
interface AnalysisResult {
  prd: any;
  gherkinFeatures: Map<string, any>;
  features: Array<{ id: string; name: string; [key: string]: any }>;
  recommendations: string[];
  validation: {
    score: number;
    warnings: string[];
    errors: string[];
  };
  summary: {
    totalFeatures: number;
    totalScenarios: number;
    byPriority: Record<string, number>;
    byComplexity: Record<string, number>;
  };
  scenarios: Map<string, any[]>;
}

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { RequirementsAnalyzer } from '@bddai/core';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export class RequirementsCommand extends Command {
  constructor() {
    super('requirements');
    this.description('Requirements management and analysis commands');
    this.addCommand(new RequirementsAddCommand());
    this.addCommand(new RequirementsAnalyzeCommand());
    this.addCommand(new RequirementsValidateCommand());
    this.addCommand(new RequirementsExportCommand());
  }
}

class RequirementsAddCommand extends Command {
  constructor() {
    super('add');
    this.description('Add a PRD or requirement file to the project');
    this.argument('<file>', 'Path to the PRD or requirement file');
    this.option('-n, --name <name>', 'Name for the requirement set');
    this.action(this.execute.bind(this));
  }

  private async execute(filePath: string, options?: any) {
    const spinner = ora('Adding requirement file...').start();

    try {
      // Verify file exists
      if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Ensure requirements directory exists
      const reqDir = join(process.cwd(), 'requirements');
      if (!existsSync(reqDir)) {
        mkdirSync(reqDir, { recursive: true });
      }

      // Copy file to requirements directory
      const fs = await import('fs/promises');
      const fileName = options?.name || filePath.split('/').pop() || 'requirements.prd';
      const destPath = join(reqDir, fileName.endsWith('.prd') ? fileName : `${fileName}.prd`);

      await fs.copyFile(filePath, destPath);

      spinner.succeed(chalk.green(`Requirements added: ${destPath}`));
      console.log(chalk.gray('\nNext steps:'));
      console.log(chalk.cyan('  bddai requirements analyze'));

    } catch (error) {
      spinner.fail(chalk.red('Failed to add requirements'));
      console.error(error);
      process.exit(1);
    }
  }
}

class RequirementsAnalyzeCommand extends Command {
  constructor() {
    super('analyze');
    this.description('Analyze requirements and generate features and scenarios');
    this.argument('[file]', 'PRD file to analyze (optional, defaults to all in requirements/)');
    this.option('-o, --output <dir>', 'Output directory for generated features', 'features');
    this.option('--no-edge-cases', 'Skip edge case scenario generation');
    this.option('--no-error-cases', 'Skip error case scenario generation');
    this.option('--no-integration', 'Skip integration scenario generation');
    this.option('--detail-level <level>', 'Scenario detail level', 'standard');
    this.action(this.execute.bind(this));
  }

  private async execute(filePath?: string, options?: any) {
    const spinner = ora('Analyzing requirements...').start();

    try {
      const analyzer = new RequirementsAnalyzer();
      let result: AnalysisResult;

      if (filePath) {
        // Analyze single file
        result = await analyzer.analyzeFile(filePath, {
          includeEdgeCases: options?.edgeCases !== false,
          includeErrorCases: options?.errorCases !== false,
          includeIntegrationScenarios: options?.integration !== false,
          detailLevel: options?.detailLevel || 'standard',
        });
      } else {
        // Analyze all files in requirements directory
        const reqDir = join(process.cwd(), 'requirements');
        const fs = await import('fs/promises');
        const files = await fs.readdir(reqDir);
        const prdFiles = files.filter(f => f.endsWith('.prd') || f.endsWith('.md'));

        if (prdFiles.length === 0) {
          throw new Error('No PRD files found in requirements/ directory');
        }

        // Combine all files
        let combinedContent = '';
        for (const file of prdFiles) {
          const content = await fs.readFile(join(reqDir, file), 'utf-8');
          combinedContent += `\n\n# ${file}\n\n${content}`;
        }

        result = await analyzer.analyzeContent(combinedContent, {
          includeEdgeCases: options?.edgeCases !== false,
          includeErrorCases: options?.errorCases !== false,
          includeIntegrationScenarios: options?.integration !== false,
          detailLevel: options?.detailLevel || 'standard',
        });
      }

      // Create output directory
      const outputDir = options?.output || 'features';
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      // Save generated features
      spinner.text = 'Saving generated features...';
      for (const [featureId, gherkinFeature] of result.gherkinFeatures) {
        const feature = result.features.find(f => f.id === featureId);
        if (feature) {
          const fileName = `${feature.name.toLowerCase().replace(/\s+/g, '-')}.feature`;
          const content = this.formatGherkinFeature(gherkinFeature);
          writeFileSync(join(outputDir, fileName), content);
        }
      }

      spinner.succeed(chalk.green('Requirements analysis completed!'));

      // Display summary
      this.displayAnalysisResult(result);

      // Show recommendations if any
      if (result.recommendations.length > 0) {
        console.log(chalk.yellow('\n💡 Recommendations:'));
        result.recommendations.forEach(rec => {
          console.log(`  • ${rec}`);
        });
      }

      // Show validation score
      console.log(chalk.blue(`\n📊 Validation Score: ${result.validation.score}/100`));

      if (result.validation.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        result.validation.warnings.forEach(warning => {
          console.log(`  • ${warning}`);
        });
      }

      if (result.validation.errors.length > 0) {
        console.log(chalk.red('\n❌ Errors:'));
        result.validation.errors.forEach(error => {
          console.log(`  • ${error}`);
        });
      }

    } catch (error) {
      spinner.fail(chalk.red('Failed to analyze requirements'));
      console.error(error);
      process.exit(1);
    }
  }

  private formatGherkinFeature(feature: any): string {
    let content = '';

    // Add tags
    if (feature.tags && feature.tags.length > 0) {
      content += feature.tags.map((tag: any) => tag.name).join(' ') + '\n';
    }

    // Add feature line
    content += `${feature.keyword}: ${feature.name}\n`;

    // Add description
    if (feature.description) {
      content += `  ${feature.description}\n`;
    }

    // Add scenarios
    if (feature.scenarios) {
      for (const scenario of feature.scenarios) {
        content += '\n';

        // Add scenario tags
        if (scenario.tags && scenario.tags.length > 0) {
          content += '  ' + scenario.tags.map((tag: any) => tag.name).join(' ') + '\n';
        }

        // Add scenario line
        content += `  ${scenario.keyword}: ${scenario.name}\n`;

        // Add description
        if (scenario.description) {
          content += `    ${scenario.description}\n`;
        }

        // Add steps
        if (scenario.steps) {
          for (const step of scenario.steps) {
            content += `    ${step.keyword} ${step.text}\n`;
          }
        }
      }
    }

    return content + '\n';
  }

  private displayAnalysisResult(result: AnalysisResult) {
    console.log(chalk.bold('\n📋 Analysis Summary:'));
    console.log(`  Total Features: ${chalk.cyan(result.summary.totalFeatures)}`);
    console.log(`  Total Scenarios: ${chalk.cyan(result.summary.totalScenarios)}`);

    console.log(chalk.bold('\n🎯 Features by Priority:'));
    Object.entries(result.summary.byPriority).forEach(([priority, count]) => {
      const color = priority === 'high' ? chalk.red : priority === 'medium' ? chalk.yellow : chalk.green;
      console.log(`  ${priority.charAt(0).toUpperCase() + priority.slice(1)}: ${color(count)}`);
    });

    console.log(chalk.bold('\n📈 Features by Complexity:'));
    Object.entries(result.summary.byComplexity).forEach(([complexity, count]) => {
      const color = complexity === 'complex' ? chalk.red : complexity === 'medium' ? chalk.yellow : chalk.green;
      console.log(`  ${complexity.charAt(0).toUpperCase() + complexity.slice(1)}: ${color(count)}`);
    });

    console.log(chalk.bold('\n✅ Generated Features:'));
    result.features.forEach(feature => {
      const scenarioCount = result.scenarios.get(feature.id)?.length || 0;
      console.log(`  • ${feature.name} (${scenarioCount} scenarios)`);
    });
  }
}

class RequirementsValidateCommand extends Command {
  constructor() {
    super('validate');
    this.description('Validate requirement completeness and quality');
    this.argument('[file]', 'PRD file to validate (optional)');
    this.option('--strict', 'Fail on warnings as well as errors');
    this.action(this.execute.bind(this));
  }

  private async execute(filePath?: string, options?: any) {
    const spinner = ora('Validating requirements...').start();

    try {
      const analyzer = new RequirementsAnalyzer();
      let result: AnalysisResult;

      if (filePath) {
        result = await analyzer.analyzeFile(filePath);
      } else {
        // Validate all files
        const reqDir = join(process.cwd(), 'requirements');
        const fs = await import('fs/promises');
        const files = await fs.readdir(reqDir);
        const prdFiles = files.filter(f => f.endsWith('.prd') || f.endsWith('.md'));

        if (prdFiles.length === 0) {
          throw new Error('No PRD files found in requirements/ directory');
        }

        let combinedContent = '';
        for (const file of prdFiles) {
          const content = await fs.readFile(join(reqDir, file), 'utf-8');
          combinedContent += `\n\n# ${file}\n\n${content}`;
        }

        result = await analyzer.analyzeContent(combinedContent);
      }

      spinner.succeed(chalk.green('Validation completed'));

      // Display validation results
      console.log(chalk.bold(`\nValidation Score: ${result.validation.score}/100`));

      if (result.validation.errors.length > 0) {
        console.log(chalk.red('\n❌ Errors:'));
        result.validation.errors.forEach(error => {
          console.log(`  • ${error}`);
        });
      }

      if (result.validation.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        result.validation.warnings.forEach(warning => {
          console.log(`  • ${warning}`);
        });
      }

      if (result.validation.errors.length === 0 &&
          (result.validation.warnings.length === 0 || !options?.strict)) {
        console.log(chalk.green('\n✅ Validation passed!'));
      } else {
        console.log(chalk.red('\n❌ Validation failed!'));
        if (options?.strict) {
          process.exit(1);
        }
      }

    } catch (error) {
      spinner.fail(chalk.red('Failed to validate requirements'));
      console.error(error);
      process.exit(1);
    }
  }
}

class RequirementsExportCommand extends Command {
  constructor() {
    super('export');
    this.description('Export analysis results to various formats');
    this.argument('<format>', 'Export format (json, markdown)');
    this.option('-o, --output <file>', 'Output file path');
    this.option('-f, --file <file>', 'PRD file to analyze (optional)');
    this.action(this.execute.bind(this));
  }

  private async execute(format: string, options?: any) {
    const spinner = ora(`Exporting to ${format}...`).start();

    try {
      const analyzer = new RequirementsAnalyzer();
      let result: AnalysisResult;

      if (options?.file) {
        result = await analyzer.analyzeFile(options.file);
      } else {
        // Analyze all files
        const reqDir = join(process.cwd(), 'requirements');
        const fs = await import('fs/promises');
        const files = await fs.readdir(reqDir);
        const prdFiles = files.filter(f => f.endsWith('.prd') || f.endsWith('.md'));

        if (prdFiles.length === 0) {
          throw new Error('No PRD files found in requirements/ directory');
        }

        let combinedContent = '';
        for (const file of prdFiles) {
          const content = await fs.readFile(join(reqDir, file), 'utf-8');
          combinedContent += `\n\n# ${file}\n\n${content}`;
        }

        result = await analyzer.analyzeContent(combinedContent);
      }

      let content: string;
      let defaultFileName: string;

      if (format.toLowerCase() === 'json') {
        content = await analyzer.exportToJSON(result as any);
        defaultFileName = 'requirements-analysis.json';
      } else if (format.toLowerCase() === 'markdown') {
        content = await analyzer.exportToMarkdown(result as any);
        defaultFileName = 'requirements-analysis.md';
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }

      const outputPath = options?.output || defaultFileName;
      writeFileSync(outputPath, content);

      spinner.succeed(chalk.green(`Exported to ${outputPath}`));

    } catch (error) {
      spinner.fail(chalk.red('Failed to export'));
      console.error(error);
      process.exit(1);
    }
  }
}