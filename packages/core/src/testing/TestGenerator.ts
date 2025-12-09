import {
  GherkinScenario,
  GherkinFeature,
  GherkinStep,
  TestFramework,
  TestType,
  TestFile,
  TestGenerationConfig,
  StepDefinitionTemplate,
} from '@bddai/types';
import { join } from 'path';

/**
 * Generates test files from Gherkin scenarios
 */
export class TestGenerator {
  private config: TestGenerationConfig;
  private frameworks: Map<TestFramework, TestFrameworkGenerator> = new Map();

  constructor(config: TestGenerationConfig) {
    this.config = config;
    this.initializeFrameworks();
  }

  /**
   * Generate test files for a scenario
   */
  async generateTests(
    scenario: GherkinScenario,
    feature: GherkinFeature
  ): Promise<TestFile[]> {
    const generator = this.frameworks.get(this.config.framework);
    if (!generator) {
      throw new Error(`Unsupported framework: ${this.config.framework}`);
    }

    return generator.generateTests(scenario, feature, this.config);
  }

  /**
   * Generate step definitions
   */
  async generateStepDefinitions(
    unmatchedSteps: GherkinStep[]
  ): Promise<StepDefinitionTemplate[]> {
    const templates: StepDefinitionTemplate[] = [];

    for (const step of unmatchedSteps) {
      const template = this.createStepTemplate(step);
      templates.push(template);
    }

    return templates;
  }

  /**
   * Generate test data for scenarios
   */
  generateTestData(scenario: GherkinScenario): any {
    const testData: any = {
      valid: {},
      invalid: {},
    };

    // Extract data from steps
    for (const step of scenario.steps) {
      if (step.text.includes('valid') || step.text.includes('correct')) {
        testData.valid = { ...testData.valid, ...this.extractDataFromStep(step) };
      } else if (step.text.includes('invalid') || step.text.includes('incorrect')) {
        testData.invalid = { ...testData.invalid, ...this.extractDataFromStep(step) };
      }
    }

    return testData;
  }

  /**
   * Initialize framework generators
   */
  private initializeFrameworks(): void {
    this.frameworks.set(TestFramework.JEST, new JestGenerator());
    this.frameworks.set(TestFramework.VITEST, new VitestGenerator());
    this.frameworks.set(TestFramework.PLAYWRIGHT, new PlaywrightGenerator());
    this.frameworks.set(TestFramework.CYPRESS, new CypressGenerator());
    this.frameworks.set(TestFramework.CUCUMBER_JS, new CucumberJSGenerator());
  }

  /**
   * Create step definition template
   */
  private createStepTemplate(step: GherkinStep): StepDefinitionTemplate {
    const stepType = this.getStepType(step.keyword);
    const pattern = this.createPatternFromStep(step.text);
    const parameters = this.extractParameters(pattern);

    return {
      pattern,
      parameters,
      implementation: this.generateStepImplementation(step, stepType),
      imports: this.getRequiredImports(step),
      helpers: [],
    };
  }

  /**
   * Get step type from keyword
   */
  private getStepType(keyword: string): 'given' | 'when' | 'then' {
    const normalized = keyword.trim().toLowerCase();
    if (normalized.startsWith('given')) return 'given';
    if (normalized.startsWith('when')) return 'when';
    if (normalized.startsWith('then')) return 'then';
    return 'given';
  }

  /**
   * Create regex pattern from step text
   */
  private createPatternFromStep(text: string): RegExp {
    // Convert text to regex pattern
    let pattern = text
      .replace(/\d+/g, '(\\d+)') // Numbers
      .replace(/"[^"]+"/g, '"([^"]*)"') // Quoted strings
      .replace(/\b(\w+)\b/g, '([\\w-]+)'); // Words

    return new RegExp(`^${pattern}$`);
  }

  /**
   * Extract parameters from pattern
   */
  private extractParameters(pattern: RegExp): string[] {
    const match = pattern.source.match(/\(([^)]+)\)/g);
    return match ? match.map(m => m.slice(1, -1)) : [];
  }

  /**
   * Generate step implementation
   */
  private generateStepImplementation(step: GherkinStep, type: string): string {
    const stepName = this.createStepName(step.text);

    return `
${type.charAt(0).toUpperCase() + type.slice(1)}(${this.createPatternFromStep((step as any).source)}, async function (${this.getParameters(step.text)}) {
  // TODO: Implement step for: ${step.text}
  throw new Error('Step not implemented');
});`;
  }

  /**
   * Get required imports for step
   */
  private getRequiredImports(step: GherkinStep): string[] {
    const imports = ['Given', 'When', 'Then'];

    if (step.argument?.type === 'DataTable') {
      imports.push('DataTable');
    }

    return imports;
  }

  /**
   * Create camelCase step name
   */
  private createStepName(text: string): string {
    return text
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .map((word, index) => index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Get parameters from step text
   */
  private getParameters(text: string): string {
    const params = [];
    let paramIndex = 1;

    // Extract numbers
    const numbers = text.match(/\d+/g);
    if (numbers) {
      params.push(`number${paramIndex++}`);
    }

    // Extract strings
    const strings = text.match(/"([^"]*)"/g);
    if (strings) {
      params.push(`string${paramIndex++}`);
    }

    return params.join(', ');
  }

  /**
   * Extract test data from step
   */
  private extractDataFromStep(step: GherkinStep): any {
    const data: any = {};

    // Extract quoted values
    const matches = step.text.match(/"([^"]*)"/g);
    if (matches) {
      matches.forEach(match => {
        const key = match.slice(1, -1).replace(/\s+/g, '_').toLowerCase();
        data[key] = match.slice(1, -1);
      });
    }

    // Extract numbers
    const numbers = step.text.match(/\d+/g);
    if (numbers) {
      numbers.forEach((num, index) => {
        data[`number_${index}`] = parseInt(num);
      });
    }

    return data;
  }
}

/**
 * Abstract base class for framework-specific generators
 */
abstract class TestFrameworkGenerator {
  abstract generateTests(
    scenario: GherkinScenario,
    feature: GherkinFeature,
    config: TestGenerationConfig
  ): TestFile[];
}

/**
 * Jest test generator
 */
class JestGenerator extends TestFrameworkGenerator {
  generateTests(
    scenario: GherkinScenario,
    feature: GherkinFeature,
    config: TestGenerationConfig
  ): TestFile[] {
    const testFile: TestFile = {
      name: `${scenario.name.toLowerCase().replace(/\s+/g, '-')}.test.ts`,
      path: join(config.outputDirectory, `${scenario.name.toLowerCase().replace(/\s+/g, '-')}.test.ts`),
      framework: TestFramework.JEST,
      type: TestType.UNIT,
      content: this.generateJestTest(scenario, feature),
      dependencies: ['@jest/globals'],
    };

    return [testFile];
  }

  private generateJestTest(scenario: GherkinScenario, feature: GherkinFeature): string {
    return `import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('${feature.name}', () => {
  describe('${scenario.name}', () => {
    beforeEach(() => {
      // Setup test environment
    });

    afterEach(() => {
      // Cleanup test environment
    });

    it('should handle the scenario correctly', async () => {
${scenario.steps.map(step => this.generateTestStep(step)).join('\n')}
    });

    it('should handle error cases', async () => {
      // TODO: Add error case tests
    });
  });
});`;
  }

  private generateTestStep(step: GherkinStep): string {
    return `
      // ${step.keyword} ${step.text}
      // TODO: Implement test step`;
  }
}

/**
 * Vitest test generator
 */
class VitestGenerator extends TestFrameworkGenerator {
  generateTests(
    scenario: GherkinScenario,
    feature: GherkinFeature,
    config: TestGenerationConfig
  ): TestFile[] {
    const testFile: TestFile = {
      name: `${scenario.name.toLowerCase().replace(/\s+/g, '-')}.test.ts`,
      path: join(config.outputDirectory, `${scenario.name.toLowerCase().replace(/\s+/g, '-')}.test.ts`),
      framework: TestFramework.VITEST,
      type: TestType.UNIT,
      content: this.generateVitestTest(scenario, feature),
      dependencies: ['vitest'],
    };

    return [testFile];
  }

  private generateVitestTest(scenario: GherkinScenario, feature: GherkinFeature): string {
    return `import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('${feature.name}', () => {
  describe('${scenario.name}', () => {
    beforeEach(() => {
      // Setup test environment
    });

    afterEach(() => {
      // Cleanup test environment
    });

    it('should handle the scenario correctly', async () => {
${scenario.steps.map(step => this.generateTestStep(step)).join('\n')}
    });

    it('should handle error cases', async () => {
      // TODO: Add error case tests
    });
  });
});`;
  }

  private generateTestStep(step: GherkinStep): string {
    return `
      // ${step.keyword} ${step.text}
      // TODO: Implement test step`;
  }
}

/**
 * Playwright test generator
 */
class PlaywrightGenerator extends TestFrameworkGenerator {
  generateTests(
    scenario: GherkinScenario,
    feature: GherkinFeature,
    config: TestGenerationConfig
  ): TestFile[] {
    const testFile: TestFile = {
      name: `${scenario.name.toLowerCase().replace(/\s+/g, '-')}.spec.ts`,
      path: join(config.outputDirectory, `${scenario.name.toLowerCase().replace(/\s+/g, '-')}.spec.ts`),
      framework: TestFramework.PLAYWRIGHT,
      type: TestType.E2E,
      content: this.generatePlaywrightTest(scenario, feature),
      dependencies: ['@playwright/test'],
    };

    return [testFile];
  }

  private generatePlaywrightTest(scenario: GherkinScenario, feature: GherkinFeature): string {
    return `import { test, expect } from '@playwright/test';

test.describe('${feature.name}', () => {
  test('${scenario.name}', async ({ page }) => {
${scenario.steps.map(step => this.generatePlaywrightStep(step)).join('\n')}
  });
});`;
  }

  private generatePlaywrightStep(step: GherkinStep): string {
    return `
    // ${step.keyword} ${step.text}
    // TODO: Implement Playwright step`;
  }
}

/**
 * Cypress test generator
 */
class CypressGenerator extends TestFrameworkGenerator {
  generateTests(
    scenario: GherkinScenario,
    feature: GherkinFeature,
    config: TestGenerationConfig
  ): TestFile[] {
    const testFile: TestFile = {
      name: `${scenario.name.toLowerCase().replace(/\s+/g, '-')}.cy.ts`,
      path: join(config.outputDirectory, `${scenario.name.toLowerCase().replace(/\s+/g, '-')}.cy.ts`),
      framework: TestFramework.CYPRESS,
      type: TestType.E2E,
      content: this.generateCypressTest(scenario, feature),
      dependencies: ['cypress'],
    };

    return [testFile];
  }

  private generateCypressTest(scenario: GherkinScenario, feature: GherkinFeature): string {
    return `describe('${feature.name}', () => {
  it('${scenario.name}', () => {
${scenario.steps.map(step => this.generateCypressStep(step)).join('\n')}
  });
});`;
  }

  private generateCypressStep(step: GherkinStep): string {
    return `
    // ${step.keyword} ${step.text}
    // TODO: Implement Cypress step`;
  }
}

/**
 * Cucumber.js test generator
 */
class CucumberJSGenerator extends TestFrameworkGenerator {
  generateTests(
    scenario: GherkinScenario,
    feature: GherkinFeature,
    config: TestGenerationConfig
  ): TestFile[] {
    const testFile: TestFile = {
      name: `${scenario.name.toLowerCase().replace(/\s+/g, '-')}.feature`,
      path: join(config.outputDirectory, `${scenario.name.toLowerCase().replace(/\s+/g, '-')}.feature`),
      framework: TestFramework.CUCUMBER_JS,
      type: TestType.ACCEPTANCE,
      content: this.generateCucumberFeature(scenario, feature),
      dependencies: ['@cucumber/cucumber'],
    };

    return [testFile];
  }

  private generateCucumberFeature(scenario: GherkinScenario, feature: GherkinFeature): string {
    return `Feature: ${feature.name}
  ${feature.description || ''}

  Scenario: ${scenario.name}
    ${scenario.description || ''}
${scenario.steps.map(step => `    ${step.keyword} ${step.text}`).join('\n')}`;
  }
}