import { ExtractedFeature, UserFlow } from './FeatureExtractor.js';
import { GherkinFeature, GherkinScenario, GherkinStep } from '@bddai/types';

/**
 * Generated Gherkin scenario with metadata
 */
export interface GeneratedScenario {
  name: string;
  description?: string;
  tags: string[];
  steps: GherkinStep[];
  type: 'happy-path' | 'error-case' | 'edge-case' | 'integration';
  source: 'user-story' | 'acceptance-criteria' | 'generated';
  confidence: number;
}

/**
 * Scenario generation options
 */
export interface ScenarioGenerationOptions {
  includeEdgeCases: boolean;
  includeErrorCases: boolean;
  includeIntegrationScenarios: boolean;
  maxScenariosPerFlow: number;
  detailLevel: 'basic' | 'standard' | 'detailed';
}

/**
 * AI-powered Scenario Generator - Converts features to Gherkin scenarios
 */
export class ScenarioGenerator {
  private defaultOptions: ScenarioGenerationOptions = {
    includeEdgeCases: true,
    includeErrorCases: true,
    includeIntegrationScenarios: true,
    maxScenariosPerFlow: 5,
    detailLevel: 'standard',
  };

  /**
   * Generate scenarios for a feature
   */
  async generateScenarios(
    feature: ExtractedFeature,
    options: Partial<ScenarioGenerationOptions> = {}
  ): Promise<GeneratedScenario[]> {
    const opts = { ...this.defaultOptions, ...options };
    const scenarios: GeneratedScenario[] = [];

    // Generate scenarios from user flows
    for (const flow of feature.userFlows) {
      const flowScenarios = await this.generateScenariosFromFlow(flow, feature, opts);
      scenarios.push(...flowScenarios);
    }

    // Generate scenarios from acceptance criteria
    const criteriaScenarios = await this.generateScenariosFromCriteria(feature, opts);
    scenarios.push(...criteriaScenarios);

    // Generate edge cases if requested
    if (opts.includeEdgeCases) {
      const edgeCases = await this.generateEdgeCases(feature, opts);
      scenarios.push(...edgeCases);
    }

    // Generate error cases if requested
    if (opts.includeErrorCases) {
      const errorCases = await this.generateErrorCases(feature, opts);
      scenarios.push(...errorCases);
    }

    // Generate integration scenarios if requested
    if (opts.includeIntegrationScenarios && feature.dependencies.length > 0) {
      const integrationScenarios = await this.generateIntegrationScenarios(feature, opts);
      scenarios.push(...integrationScenarios);
    }

    // Deduplicate and sort scenarios
    const uniqueScenarios = this.deduplicateScenarios(scenarios);
    return this.sortScenariosByPriority(uniqueScenarios);
  }

  /**
   * Generate Gherkin feature file
   */
  async generateFeatureFile(
    feature: ExtractedFeature,
    scenarios: GeneratedScenario[]
  ): Promise<GherkinFeature> {
    // Filter scenarios for this feature
    const featureScenarios = scenarios.map(s => this.convertToGherkinScenario(s));

    return {
      uri: `features/${feature.name.toLowerCase().replace(/\s+/g, '-')}.feature`,
      name: feature.name,
      keyword: 'Feature',
      description: feature.description,
      line: 1,
      tags: [
        { name: `@priority-${feature.priority}`, line: 2 },
        { name: `@complexity-${feature.complexity}`, line: 3 },
      ],
      scenarios: featureScenarios,
      scenarioOutlines: [],
    };
  }

  /**
   * Generate scenarios from user flow
   */
  private async generateScenariosFromFlow(
    flow: UserFlow,
    feature: ExtractedFeature,
    options: ScenarioGenerationOptions
  ): Promise<GeneratedScenario[]> {
    const scenarios: GeneratedScenario[] = [];

    // Main happy path scenario
    const happyPath: GeneratedScenario = {
      name: this.generateScenarioName(flow.name, 'success'),
      description: flow.description,
      tags: ['@happy-path', `@actor-${flow.actor.toLowerCase()}`],
      steps: this.generateStepsFromFlow(flow, 'happy-path'),
      type: 'happy-path',
      source: 'user-story',
      confidence: 0.9,
    };
    scenarios.push(happyPath);

    // Generate variations based on detail level
    if (options.detailLevel === 'detailed' && flow.steps.length > 2) {
      // Generate partial success scenario
      const partialScenario: GeneratedScenario = {
        name: this.generateScenarioName(flow.name, 'partial'),
        description: `Partial completion of ${flow.name}`,
        tags: ['@partial'],
        steps: this.generatePartialSteps(flow),
        type: 'edge-case',
        source: 'generated',
        confidence: 0.7,
      };
      scenarios.push(partialScenario);
    }

    return scenarios.slice(0, options.maxScenariosPerFlow);
  }

  /**
   * Generate scenarios from acceptance criteria
   */
  private async generateScenariosFromCriteria(
    feature: ExtractedFeature,
    options: ScenarioGenerationOptions
  ): Promise<GeneratedScenario[]> {
    const scenarios: GeneratedScenario[] = [];

    for (const req of feature.requirements) {
      if (req.acceptanceCriteria && req.acceptanceCriteria.length > 0) {
        // Group related criteria into scenarios
        const criteriaGroups = this.groupRelatedCriteria(req.acceptanceCriteria);

        for (const group of criteriaGroups) {
          const scenario: GeneratedScenario = {
            name: this.generateScenarioName(req.title, 'criteria'),
            description: req.description,
            tags: ['@acceptance-criteria'],
            steps: this.generateStepsFromCriteria(group),
            type: 'happy-path',
            source: 'acceptance-criteria',
            confidence: 0.8,
          };
          scenarios.push(scenario);
        }
      }
    }

    return scenarios;
  }

  /**
   * Generate edge case scenarios
   */
  private async generateEdgeCases(
    feature: ExtractedFeature,
    options: ScenarioGenerationOptions
  ): Promise<GeneratedScenario[]> {
    const scenarios: GeneratedScenario[] = [];

    // Generate boundary value scenarios
    if (feature.name.toLowerCase().includes('search') ||
        feature.name.toLowerCase().includes('filter')) {
      scenarios.push({
        name: `${feature.name} with boundary values`,
        tags: ['@edge-case', '@boundary'],
        steps: [
          { keyword: 'Given', text: 'the system is at maximum capacity', line: 1 },
          { keyword: 'When', text: 'the user performs the action', line: 2 },
          { keyword: 'Then', text: 'the system should handle gracefully', line: 3 },
        ],
        type: 'edge-case',
        source: 'generated',
        confidence: 0.6,
      });
    }

    // Generate concurrent user scenarios
    scenarios.push({
      name: `Multiple ${feature.actor || 'users'} performing actions simultaneously`,
      tags: ['@edge-case', '@concurrent'],
      steps: [
        { keyword: 'Given', text: 'multiple users are active in the system', line: 1 },
        { keyword: 'When', text: 'users perform actions simultaneously', line: 2 },
        { keyword: 'Then', text: 'all actions should be processed correctly', line: 3 },
        { keyword: 'And', text: 'data integrity should be maintained', line: 4 },
      ],
      type: 'edge-case',
      source: 'generated',
      confidence: 0.7,
    });

    return scenarios;
  }

  /**
   * Generate error case scenarios
   */
  private async generateErrorCases(
    feature: ExtractedFeature,
    options: ScenarioGenerationOptions
  ): Promise<GeneratedScenario[]> {
    const scenarios: GeneratedScenario[] = [];

    // Network error scenario
    scenarios.push({
      name: `${feature.name} with network failure`,
      tags: ['@error-case', '@network'],
      steps: [
        { keyword: 'Given', text: 'the network connection is unavailable', line: 1 },
        { keyword: 'When', text: 'the user attempts to perform the action', line: 2 },
        { keyword: 'Then', text: 'the system should display appropriate error message', line: 3 },
        { keyword: 'And', text: 'the system should retry connection when available', line: 4 },
      ],
      type: 'error-case',
      source: 'generated',
      confidence: 0.8,
    });

    // Invalid input scenario
    scenarios.push({
      name: `${feature.name} with invalid input`,
      tags: ['@error-case', '@validation'],
      steps: [
        { keyword: 'Given', text: 'the user provides invalid input', line: 1 },
        { keyword: 'When', text: 'the user submits the form', line: 2 },
        { keyword: 'Then', text: 'the system should validate the input', line: 3 },
        { keyword: 'And', text: 'the system should show specific error messages', line: 4 },
        { keyword: 'And', text: 'the system should preserve valid input', line: 5 },
      ],
      type: 'error-case',
      source: 'generated',
      confidence: 0.9,
    });

    // Unauthorized access scenario
    if (feature.name.toLowerCase().includes('auth') ||
        feature.name.toLowerCase().includes('login')) {
      scenarios.push({
        name: 'Unauthorized access attempt',
        tags: ['@error-case', '@security'],
        steps: [
          { keyword: 'Given', text: 'the user is not authenticated', line: 1 },
          { keyword: 'When', text: 'the user tries to access protected resources', line: 2 },
          { keyword: 'Then', text: 'the system should deny access', line: 3 },
          { keyword: 'And', text: 'the system should redirect to login', line: 4 },
        ],
        type: 'error-case',
        source: 'generated',
        confidence: 0.9,
      });
    }

    return scenarios;
  }

  /**
   * Generate integration scenarios
   */
  private async generateIntegrationScenarios(
    feature: ExtractedFeature,
    options: ScenarioGenerationOptions
  ): Promise<GeneratedScenario[]> {
    const scenarios: GeneratedScenario[] = [];

    for (const dependency of feature.dependencies) {
      scenarios.push({
        name: `${feature.name} integrates with ${dependency}`,
        tags: ['@integration', `@dependency-${dependency}`],
        steps: [
          { keyword: 'Given', text: `${dependency} service is available`, line: 1 },
          { keyword: 'And', text: `the system is configured to use ${dependency}`, line: 2 },
          { keyword: 'When', text: `the feature needs to communicate with ${dependency}`, line: 3 },
          { keyword: 'Then', text: 'the integration should work seamlessly', line: 4 },
          { keyword: 'And', text: 'data should be synchronized correctly', line: 5 },
        ],
        type: 'integration',
        source: 'generated',
        confidence: 0.7,
      });
    }

    return scenarios;
  }

  /**
   * Generate steps from user flow
   */
  private generateStepsFromFlow(flow: UserFlow, type: string): GherkinStep[] {
    const steps: GherkinStep[] = [];
    let lineNumber = 1;

    // Add context setup
    steps.push({
      keyword: 'Given',
      text: `the ${flow.actor.toLowerCase()} is on the relevant screen`,
      line: lineNumber++,
    });

    // Add flow steps
    for (const flowStep of flow.steps) {
      if (lineNumber === 2) {
        steps.push({
          keyword: 'When',
          text: flowStep,
          line: lineNumber++,
        });
      } else {
        steps.push({
          keyword: 'And',
          text: flowStep,
          line: lineNumber++,
        });
      }
    }

    // Add outcome
    steps.push({
      keyword: 'Then',
      text: 'the expected outcome should occur',
      line: lineNumber++,
    });

    return steps;
  }

  /**
   * Generate partial steps for edge cases
   */
  private generatePartialSteps(flow: UserFlow): GherkinStep[] {
    const steps: GherkinStep[] = [];
    const partialFlow = flow.steps.slice(0, Math.floor(flow.steps.length / 2));

    steps.push({
      keyword: 'Given',
      text: `the ${flow.actor.toLowerCase()} is performing an action`,
      line: 1,
    });

    partialFlow.forEach((step, index) => {
      steps.push({
        keyword: index === 0 ? 'When' : 'And',
        text: step,
        line: index + 2,
      });
    });

    steps.push({
      keyword: 'Then',
      text: 'the system should handle partial completion',
      line: partialFlow.length + 2,
    });

    return steps;
  }

  /**
   * Generate steps from acceptance criteria
   */
  private generateStepsFromCriteria(criteria: string[]): GherkinStep[] {
    const steps: GherkinStep[] = [];

    // Add precondition
    steps.push({
      keyword: 'Given',
      text: 'the system is in the initial state',
      line: 1,
    });

    // Add action
    steps.push({
      keyword: 'When',
      text: 'the relevant action is performed',
      line: 2,
    });

    // Add criteria as assertions
    criteria.forEach((criterion, index) => {
      steps.push({
        keyword: index === 0 ? 'Then' : 'And',
        text: criterion,
        line: index + 3,
      });
    });

    return steps;
  }

  /**
   * Group related acceptance criteria
   */
  private groupRelatedCriteria(criteria: string[]): string[][] {
    const groups: string[][] = [];
    const maxCriteriaPerGroup = 5;

    for (let i = 0; i < criteria.length; i += maxCriteriaPerGroup) {
      groups.push(criteria.slice(i, i + maxCriteriaPerGroup));
    }

    return groups;
  }

  /**
   * Generate scenario name
   */
  private generateScenarioName(baseName: string, type: string): string {
    const cleanName = baseName.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();

    switch (type) {
      case 'success':
        return `${cleanName} - Success`;
      case 'partial':
        return `${cleanName} - Partial completion`;
      case 'criteria':
        return cleanName;
      default:
        return cleanName;
    }
  }

  /**
   * Deduplicate scenarios
   */
  private deduplicateScenarios(scenarios: GeneratedScenario[]): GeneratedScenario[] {
    const seen = new Set<string>();
    const unique: GeneratedScenario[] = [];

    for (const scenario of scenarios) {
      const key = `${scenario.name}-${scenario.steps.map(s => s.text).join('|')}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(scenario);
      }
    }

    return unique;
  }

  /**
   * Sort scenarios by priority
   */
  private sortScenariosByPriority(scenarios: GeneratedScenario[]): GeneratedScenario[] {
    const typeOrder = {
      'happy-path': 1,
      'integration': 2,
      'edge-case': 3,
      'error-case': 4,
    };

    return scenarios.sort((a, b) => {
      // First by type
      const typeDiff = typeOrder[a.type] - typeOrder[b.type];
      if (typeDiff !== 0) return typeDiff;

      // Then by confidence
      const confidenceDiff = b.confidence - a.confidence;
      if (confidenceDiff !== 0) return confidenceDiff;

      // Finally by name
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Convert generated scenario to Gherkin scenario
   */
  private convertToGherkinScenario(scenario: GeneratedScenario): GherkinScenario {
    return {
      name: scenario.name,
      keyword: 'Scenario',
      description: scenario.description,
      line: 1,
      tags: scenario.tags.map((tag, index) => ({
        name: tag,
        line: index + 2,
      })),
      steps: scenario.steps,
    };
  }
}