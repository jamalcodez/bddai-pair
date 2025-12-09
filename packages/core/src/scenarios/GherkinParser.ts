import {
  GherkinDocument,
  GherkinFeature,
  GherkinScenario,
  GherkinScenarioOutline,
  GherkinBackground,
  GherkinStep,
  ParsedStep,
  StepPattern,
  ExecutionContext,
} from '@bddai/types';
import { readFileSync } from 'fs';
import { relative, join } from 'path';

/**
 * Gherkin parser implementation using @cucumber/gherkin
 */
export class GherkinParser {
  private stepPatterns: Map<string, StepPattern> = new Map();

  /**
   * Parse a Gherkin feature file
   */
  async parseFeature(filePath: string): Promise<GherkinDocument> {
    const content = readFileSync(filePath, 'utf-8');

    // Simple parser implementation (stub for now)
    const feature = this.parseFeatureContent(content, filePath);

    return {
      uri: relative(process.cwd(), filePath),
      feature,
    };
  }

  /**
   * Parse multiple feature files
   */
  async parseFeatures(directory: string): Promise<GherkinDocument[]> {
    const { readdirSync } = require('fs');
    const files = readdirSync(directory)
      .filter((file: string) => file.endsWith('.feature'))
      .map((file: string) => join(directory, file));

    const documents: GherkinDocument[] = [];
    for (const file of files) {
      try {
        const doc = await this.parseFeature(file);
        documents.push(doc);
      } catch (error) {
        console.error(`Error parsing ${file}:`, error);
      }
    }

    return documents;
  }

  /**
   * Parse feature content
   */
  private parseFeatureContent(content: string, filePath: string): GherkinFeature {
    const lines = content.split('\n');
    let currentLine = 0;

    // Find feature line
    const featureLine = lines.find((line, idx) => {
      if (line.trim().startsWith('Feature:')) {
        currentLine = idx;
        return true;
      }
      return false;
    }) || '';

    const featureName = featureLine.replace('Feature:', '').trim();

    return {
      uri: relative(process.cwd(), filePath),
      name: featureName,
      keyword: 'Feature',
      line: currentLine + 1,
      description: '',
      scenarios: [],
      scenarioOutlines: [],
      tags: [],
    };
  }

  /**
   * Register a step pattern for matching
   */
  registerStepPattern(id: string, pattern: StepPattern): void;
  registerStepPattern(pattern: StepPattern): void;
  registerStepPattern(idOrPattern: string | StepPattern, pattern?: StepPattern): void {
    if (typeof idOrPattern === 'string' && pattern) {
      this.stepPatterns.set(idOrPattern, pattern);
    } else if (typeof idOrPattern === 'object') {
      this.stepPatterns.set(idOrPattern.pattern.source, idOrPattern);
    }
  }

  /**
   * Parse a step and match against patterns
   */
  parseStep(step: GherkinStep, context?: ExecutionContext): ParsedStep {
    const matched = this.matchStep(step.text);

    return {
      ...step,
      matchedPattern: matched?.pattern,
      parameters: matched?.params || [],
    };
  }

  /**
   * Match a step text against registered patterns
   */
  private matchStep(text: string): { pattern: StepPattern; params: string[] } | null {
    for (const [, stepPattern] of this.stepPatterns) {
      const match = text.match(stepPattern.pattern);

      if (match) {
        return {
          pattern: stepPattern,
          params: match.slice(1),
        };
      }
    }

    return null;
  }

  /**
   * Extract step patterns from scenarios
   */
  extractStepPatterns(feature: GherkinFeature): StepPattern[] {
    const patterns: StepPattern[] = [];
    const seen = new Set<string>();

    for (const scenario of feature.scenarios || []) {
      for (const step of scenario.steps || []) {
        const patternStr = this.generateStepPattern(step);
        if (!seen.has(patternStr)) {
          seen.add(patternStr);
          patterns.push({
            type: step.keyword.toLowerCase().trim() as any,
            pattern: new RegExp(patternStr),
            implementation: `// TODO: Implement ${step.keyword} ${step.text}`,
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Get step patterns
   */
  getStepPatterns(): Map<string, StepPattern> {
    return this.stepPatterns;
  }

  /**
   * Generate step definitions from feature
   */
  generateStepDefinitions(feature: GherkinFeature): string;
  generateStepDefinitions(steps: any[]): string;
  generateStepDefinitions(featureOrSteps: GherkinFeature | any[]): string {
    let patterns: StepPattern[];

    if (Array.isArray(featureOrSteps)) {
      // Generate from steps array
      const seen = new Set<string>();
      patterns = [];
      for (const step of featureOrSteps) {
        const patternStr = this.generateStepPattern(step);
        if (!seen.has(patternStr)) {
          seen.add(patternStr);
          patterns.push({
            type: step.keyword?.toLowerCase().trim() || 'given',
            pattern: new RegExp(patternStr),
            implementation: `// TODO: Implement ${step.keyword} ${step.text}`,
          });
        }
      }
    } else {
      patterns = this.extractStepPatterns(featureOrSteps);
    }

    let code = '';
    for (const pattern of patterns) {
      const params = this.extractParamsFromPattern(pattern.pattern);
      code += `\n${pattern.type}('${pattern.pattern.source}', async (${params.join(', ')}) => {\n`;
      code += `  ${pattern.implementation}\n`;
      code += `});\n`;
    }

    return code;
  }

  /**
   * Generate a pattern from a step
   */
  private generateStepPattern(step: GherkinStep): string {
    return step.text
      .replace(/"([^"]+)"/g, '([^"]+)')
      .replace(/\d+/g, '(\\d+)');
  }

  /**
   * Extract parameter names from pattern
   */
  private extractParamsFromPattern(pattern: RegExp): string[] {
    const params: string[] = [];
    const source = pattern.source;

    // Count capturing groups
    let count = 0;
    for (let i = 0; i < source.length; i++) {
      if (source[i] === '(' && source[i - 1] !== '\\' && source[i + 1] !== '?') {
        params.push(`param${count++}`);
      }
    }

    return params;
  }
}
