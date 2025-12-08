import {
  GherkinDocument,
  GherkinFeature,
  GherkinScenario,
  StepPattern,
  ProjectConfig,
  FeatureMetadata
} from '@bddai/types';
import { GherkinParser } from './GherkinParser.js';
import { ScenarioStorage } from './ScenarioStorage.js';
import { StepRegistry } from './StepRegistry.js';
import { join, basename, extname } from 'path';
import { watch } from 'chokidar';
import { EventEmitter } from 'events';

/**
 * Manages scenarios, features, and their lifecycle
 */
export class ScenarioManager extends EventEmitter {
  private parser: GherkinParser;
  private storage: ScenarioStorage;
  private stepRegistry: StepRegistry;
  private watcher?: any;
  private features: Map<string, GherkinDocument> = new Map();
  private config: ProjectConfig;

  constructor(config: ProjectConfig) {
    super();
    this.config = config;
    this.parser = new GherkinParser();
    this.storage = new ScenarioStorage(config.featuresDirectory);
    this.stepRegistry = new StepRegistry();

    // Load existing step patterns
    this.loadStepPatterns();
  }

  /**
   * Initialize the scenario manager
   */
  async initialize(): Promise<void> {
    // Load all features
    await this.loadAllFeatures();

    // Start watching for changes
    if (this.config.autoGenerate) {
      this.startWatcher();
    }
  }

  /**
   * Load all features from the features directory
   */
  async loadAllFeatures(): Promise<void> {
    const documents = await this.parser.parseFeatures(this.config.featuresDirectory);

    for (const document of documents) {
      if (document.feature) {
        this.features.set(document.uri, document);
        this.emit('featureLoaded', document.feature);
      }
    }

    this.emit('featuresLoaded', Array.from(this.features.values()));
  }

  /**
   * Create a new feature
   */
  async createFeature(
    name: string,
    description?: string,
    tags?: string[]
  ): Promise<GherkinFeature> {
    const feature = await this.storage.createFeature(name, description, tags);

    // Parse the newly created feature
    const document = await this.parser.parseFeature(feature.path);
    this.features.set(document.uri, document);

    this.emit('featureCreated', feature);
    return document.feature!;
  }

  /**
   * Add a scenario to an existing feature
   */
  async addScenario(
    featurePath: string,
    scenarioName: string,
    steps: Array<{ keyword: string; text: string }>,
    tags?: string[]
  ): Promise<GherkinScenario> {
    const scenario = await this.storage.addScenario(featurePath, scenarioName, steps, tags);

    // Reload the feature
    await this.reloadFeature(featurePath);

    this.emit('scenarioAdded', { featurePath, scenario });
    return scenario;
  }

  /**
   * Get a feature by its path
   */
  getFeature(path: string): GherkinDocument | undefined {
    return this.features.get(path);
  }

  /**
   * Get all features
   */
  getAllFeatures(): GherkinDocument[] {
    return Array.from(this.features.values());
  }

  /**
   * Get all scenarios across all features
   */
  getAllScenarios(): GherkinScenario[] {
    const scenarios: GherkinScenario[] = [];

    for (const document of this.features.values()) {
      if (document.feature) {
        scenarios.push(...document.feature.scenarios);
      }
    }

    return scenarios;
  }

  /**
   * Get metadata for all features
   */
  getFeaturesMetadata(): FeatureMetadata[] {
    const metadata: FeatureMetadata[] = [];

    for (const [path, document] of this.features) {
      if (document.feature) {
        metadata.push({
          name: document.feature.name,
          path,
          scenarios: document.feature.scenarios.length,
          lastModified: new Date(), // TODO: Get actual file modification time
          tags: document.feature.tags?.map(t => t.name) || [],
          status: 'draft', // TODO: Determine actual status
        });
      }
    }

    return metadata;
  }

  /**
   * Generate step definitions for a feature
   */
  async generateStepDefinitions(featurePath: string): Promise<string> {
    const document = this.features.get(featurePath);
    if (!document?.feature) {
      throw new Error(`Feature not found: ${featurePath}`);
    }

    const allSteps: any[] = [];

    // Collect steps from background and scenarios
    if (document.feature.background) {
      allSteps.push(...document.feature.background.steps);
    }

    for (const scenario of document.feature.scenarios) {
      allSteps.push(...scenario.steps);
    }

    // Match steps against patterns
    const unmatchedSteps = allSteps.filter(step => {
      return !this.stepRegistry.hasMatchingPattern(step);
    });

    // Generate definitions for unmatched steps
    return this.parser.generateStepDefinitions(unmatchedSteps);
  }

  /**
   * Register a step pattern
   */
  registerStepPattern(id: string, pattern: StepPattern): void {
    this.parser.registerStepPattern(id, pattern);
    this.stepRegistry.register(id, pattern);
    this.emit('stepPatternRegistered', { id, pattern });
  }

  /**
   * Get all registered step patterns
   */
  getStepPatterns(): Map<string, StepPattern> {
    return this.parser.getStepPatterns();
  }

  /**
   * Validate a feature
   */
  async validateFeature(featurePath: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const document = this.features.get(featurePath);
    if (!document?.feature) {
      return {
        valid: false,
        errors: ['Feature not found'],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate scenarios have steps
    for (const scenario of document.feature.scenarios) {
      if (scenario.steps.length === 0) {
        warnings.push(`Scenario "${scenario.name}" has no steps`);
      }
    }

    // Validate step patterns
    for (const scenario of document.feature.scenarios) {
      for (const step of scenario.steps) {
        if (!this.stepRegistry.hasMatchingPattern(step)) {
          warnings.push(`No step definition found for: ${step.keyword} ${step.text}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Start watching for file changes
   */
  private startWatcher(): void {
    const pattern = join(this.config.featuresDirectory, '**/*.feature');

    this.watcher = watch(pattern, {
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher.on('change', async (path: string) => {
      await this.reloadFeature(path);
      this.emit('featureChanged', path);
    });

    this.watcher.on('add', async (path: string) => {
      await this.reloadFeature(path);
      this.emit('featureAdded', path);
    });

    this.watcher.on('unlink', (path: string) => {
      this.features.delete(path);
      this.emit('featureRemoved', path);
    });
  }

  /**
   * Reload a feature from disk
   */
  private async reloadFeature(path: string): Promise<void> {
    try {
      const document = await this.parser.parseFeature(path);
      this.features.set(path, document);
    } catch (error) {
      console.error(`Failed to reload feature ${path}:`, error);
    }
  }

  /**
   * Load existing step patterns
   */
  private async loadStepPatterns(): Promise<void> {
    // TODO: Load from step definitions directory
    // For now, register some common patterns
    this.registerStepPattern('common-given', {
      pattern: /^Given (?:a|an) (.+) exists?$/,
      implementation: '',
      type: 'given',
    });

    this.registerStepPattern('common-when', {
      pattern: /^When the user (.+)$/,
      implementation: '',
      type: 'when',
    });

    this.registerStepPattern('common-then', {
      pattern: /^Then the system should (.+)$/,
      implementation: '',
      type: 'then',
    });
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
    }
    this.removeAllListeners();
  }
}