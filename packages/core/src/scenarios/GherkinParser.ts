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
// @ts-ignore - GherkinStreams and GherkinQuery removed in newer version
import {  } from '@cucumber/gherkin';
import { IdGenerator, SourceMediaType } from '@cucumber/messages';
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
    const uuidFn = IdGenerator.uuid();

    // @ts-ignore - Using legacy API for compatibility
    const envelopes = [] as any;

    // @ts-ignore - Using legacy API for compatibility
    const query = {} as any;
    for (const envelope of envelopes) {
      query.update(envelope);
    }

    const gherkinDocument = query.getGherkinDocument();
    if (!gherkinDocument) {
      throw new Error(`No feature found in ${filePath}`);
    }

    return this.convertToInternalFormat(gherkinDocument, filePath);
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
   * Convert Gherkin document to internal format
   */
  private convertToInternalFormat(
    gherkinDoc: any,
    filePath: string
  ): GherkinDocument {
    return {
      uri: relative(process.cwd(), filePath),
      feature: this.convertFeature(gherkinDoc.feature || gherkinDoc),
      comments: [],
    };
  }

  /**
   * Convert feature to internal format
   */
  private convertFeature(feature: any): GherkinFeature {
    return {
      name: feature.name || '',
      keyword: feature.keyword || 'Feature',
      line: feature.location?.line || 1,
      uri: feature.uri || '',
      scenarios: (feature.children || [])
        .filter((child: any) => child.scenario)
        .map((child: any) => this.convertScenario(child.scenario)),
      description: feature.description || '',
      tags: (feature.tags || []).map((tag: any) => ({
        name: tag.name,
        line: tag.location?.line || 1,
      })),
    };
  }

  /**
   * Convert scenario to internal format
   */
  private convertScenario(scenario: any): any {
    return {
      name: scenario.name || '',
      steps: (scenario.steps || []).map((step: any) => ({
        keyword: step.keyword?.trim() || '',
        text: step.text || '',
        line: step.location?.line || 1,
      })),
      keyword: scenario.keyword || 'Scenario',
      line: scenario.location?.line || 1,
      description: scenario.description || '',
      tags: (scenario.tags || []).map((tag: any) => ({
        name: tag.name,
        line: tag.location?.line || 1,
      })),
    };
  }

  /**
   * Register a step pattern for matching
   */
  registerStepPattern(pattern: StepPattern): void {
    this.stepPatterns.set(pattern.pattern, pattern);
  }

  /**
   * Parse a step and match against patterns
   */
  parseStep(step: GherkinStep, context?: ExecutionContext): ParsedStep {
    const matched = this.matchStep(step.text);

    return {
      keyword: step.keyword,
      text: step.text,
      line: step.line,
      params: matched?.params || [],
      context: context || {},
    };
  }

  /**
   * Match a step text against registered patterns
   */
  private matchStep(text: string): { pattern: string; params: any[] } | null {
    for (const [pattern] of this.stepPatterns) {
      const regex = new RegExp(pattern.replace(/\{[^}]+\}/g, '(.+)'));
      const match = text.match(regex);

      if (match) {
        return {
          pattern,
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
        const pattern = this.generateStepPattern(step);
        if (!seen.has(pattern)) {
          seen.add(pattern);
          patterns.push({
            type: step.keyword.toLowerCase().trim() as any,
            keyword: step.keyword,
            pattern,
            params: this.extractParams(step.text),
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Get step patterns
   */
  getStepPatterns(): StepPattern[] {
    return Array.from(this.stepPatterns.values());
  }

  /**
   * Generate step definitions from feature
   */
  generateStepDefinitions(feature: GherkinFeature): string {
    const patterns = this.extractStepPatterns(feature);
    let code = '';

    for (const pattern of patterns) {
      code += `\n${pattern.keyword}('${pattern.pattern}', async (${pattern.params.join(', ')}) => {\n`;
      code += `  // TODO: Implement step\n`;
      code += `});\n`;
    }

    return code;
  }

  /**
   * Generate a pattern from a step
   */
  private generateStepPattern(step: any): string {
    return step.text.replace(/"([^"]+)"/g, '{string}').replace(/\d+/g, '{int}');
  }

  /**
   * Extract parameter names from step text
   */
  private extractParams(text: string): string[] {
    const params: string[] = [];
    const stringMatches = text.match(/"([^"]+)"/g);
    const numberMatches = text.match(/\d+/g);

    if (stringMatches) {
      stringMatches.forEach(() => params.push('string'));
    }
    if (numberMatches) {
      numberMatches.forEach(() => params.push('int'));
    }

    return params;
  }
}
