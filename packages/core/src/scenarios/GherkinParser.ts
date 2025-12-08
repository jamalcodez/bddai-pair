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
import { GherkinStreams, GherkinQuery } from '@cucumber/gherkin';
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

    const envelopes = GherkinStreams.fromSources(
      [
        {
          uri: relative(process.cwd(), filePath),
          data: content,
          mediaType: SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_PLAIN,
        },
      ],
      uuidFn
    );

    const query = new GherkinQuery();
    for (const envelope of envelopes) {
      query.update(envelope);
    }

    const gherkinDocument = query.getGherkinDocument();
    if (!gherkinDocument) {
      throw new Error(`No feature found in ${filePath}`);
    }

    // Convert to our schema
    return this.convertToGherkinDocument(gherkinDocument, filePath);
  }

  /**
   * Parse multiple feature files from a directory
   */
  async parseFeatures(directory: string): Promise<GherkinDocument[]> {
    const { glob } = await import('glob');
    const featureFiles = await glob('**/*.feature', { cwd: directory });

    const documents: GherkinDocument[] = [];
    for (const file of featureFiles) {
      try {
        const document = await this.parseFeature(join(directory, file));
        documents.push(document);
      } catch (error) {
        console.error(`Failed to parse ${file}:`, error);
      }
    }

    return documents;
  }

  /**
   * Register a step pattern
   */
  registerStepPattern(id: string, pattern: StepPattern): void {
    this.stepPatterns.set(id, pattern);
  }

  /**
   * Get all registered step patterns
   */
  getStepPatterns(): Map<string, StepPattern> {
    return new Map(this.stepPatterns);
  }

  /**
   * Match steps to registered patterns
   */
  matchSteps(scenario: GherkinScenario): ParsedStep[] {
    return scenario.steps.map(step => {
      const parsedStep: ParsedStep = { ...step };

      // Try to match against registered patterns
      for (const [id, pattern] of this.stepPatterns) {
        const match = step.text.match(pattern.pattern);
        if (match) {
          parsedStep.matchedPattern = pattern;
          parsedStep.parameters = match.slice(1); // Exclude full match
          break;
        }
      }

      return parsedStep;
    });
  }

  /**
   * Create execution context for a scenario
   */
  createExecutionContext(
    scenario: GherkinScenario,
    feature: GherkinFeature
  ): ExecutionContext {
    const steps = this.matchSteps(scenario);

    return {
      scenario,
      feature,
      variables: {},
      steps,
    };
  }

  /**
   * Generate step definitions for unmatched steps
   */
  generateStepDefinitions(unmatchedSteps: GherkinStep[]): string {
    const definitions: string[] = [];

    for (const step of unmatchedSteps) {
      const stepType = this.getStepType(step.keyword);
      const stepText = step.text;

      // Convert step text to pattern
      const pattern = this.textToPattern(stepText);

      definitions.push(`
${this.generateStepFunction(stepType, pattern, stepText)}`);
    }

    return definitions.join('\n\n');
  }

  /**
   * Convert from Cucumber's internal format to our schema
   */
  private convertToGherkinDocument(gherkinDocument: any, filePath: string): GherkinDocument {
    const feature = gherkinDocument.feature;
    if (!feature) {
      return { uri: filePath };
    }

    const background = feature.children?.find((child: any) => child.background)?.background;
    const scenarios = feature.children?.filter((child: any) => child.scenario).map((child: any) => child.scenario) || [];
    const scenarioOutlines = feature.children?.filter((child: any) => child.scenarioOutline).map((child: any) => child.scenarioOutline) || [];

    return {
      uri: filePath,
      feature: {
        uri: filePath,
        name: feature.name,
        keyword: feature.keyword,
        description: feature.description || undefined,
        line: feature.location?.line || 0,
        tags: feature.tags?.map((tag: any) => ({
          name: tag.name,
          line: tag.location?.line || 0,
        })) || [],
        background: background ? this.convertBackground(background) : undefined,
        scenarios: scenarios.map(s => this.convertScenario(s)),
        scenarioOutlines: scenarioOutlines.map(so => this.convertScenarioOutline(so)),
      },
    };
  }

  private convertBackground(background: any): GherkinBackground {
    return {
      name: background.name,
      keyword: background.keyword,
      description: background.description || undefined,
      line: background.location?.line || 0,
      steps: background.steps?.map((step: any) => this.convertStep(step)) || [],
    };
  }

  private convertScenario(scenario: any): GherkinScenario {
    return {
      name: scenario.name,
      keyword: scenario.keyword,
      description: scenario.description || undefined,
      line: scenario.location?.line || 0,
      tags: scenario.tags?.map((tag: any) => ({
        name: tag.name,
        line: tag.location?.line || 0,
      })) || [],
      steps: scenario.steps?.map((step: any) => this.convertStep(step)) || [],
    };
  }

  private convertScenarioOutline(outline: any): GherkinScenarioOutline {
    return {
      name: outline.name,
      keyword: outline.keyword,
      description: outline.description || undefined,
      line: outline.location?.line || 0,
      tags: outline.tags?.map((tag: any) => ({
        name: tag.name,
        line: tag.location?.line || 0,
      })) || [],
      steps: outline.steps?.map((step: any) => this.convertStep(step)) || [],
      examples: outline.examples?.map((example: any) => ({
        name: example.name,
        description: example.description || undefined,
        line: example.location?.line || 0,
        tableHeader: example.tableHeader?.cells?.map((cell: any) => cell.value) || [],
        tableBody: example.tableBody?.map((row: any) =>
          row.cells?.map((cell: any) => cell.value) || []
        ) || [],
      })) || [],
    };
  }

  private convertStep(step: any): GherkinStep {
    const result: GherkinStep = {
      keyword: step.keyword,
      text: step.text,
      line: step.location?.line || 0,
    };

    if (step.docString) {
      result.argument = {
        type: 'DocString',
        content: step.docString.content,
        contentType: step.docString.mediaType,
      };
    } else if (step.dataTable) {
      result.argument = {
        type: 'DataTable',
        rows: step.dataTable.rows?.map((row: any) =>
          row.cells?.map((cell: any) => cell.value) || []
        ) || [],
      };
    }

    return result;
  }

  private getStepType(keyword: string): 'given' | 'when' | 'then' {
    const normalized = keyword.trim().toLowerCase();
    if (normalized.startsWith('given') || normalized.startsWith('and') || normalized.startsWith('but')) {
      // We'll need context from previous steps for And/But, defaulting to given for now
      return 'given';
    } else if (normalized.startsWith('when')) {
      return 'when';
    } else if (normalized.startsWith('then')) {
      return 'then';
    }
    return 'given';
  }

  private textToPattern(text: string): string {
    // Replace quoted strings with capture groups
    return text.replace(/"[^"]+"/g, '"([^"]*)"')
               // Replace numbers with capture groups
               .replace(/\b\d+\b/g, '(\\d+)')
               // Replace parameters with capture groups
               .replace(/\b[a-z_]+\b/gi, '([a-z_-]+)');
  }

  private generateStepFunction(type: string, pattern: string, example: string): string {
    return `${type.charAt(0).toUpperCase() + type.slice(1)}(${pattern}, async function () {
  // TODO: Implement step for: ${example}
  throw new Error('Step not implemented');
});`;
  }
}