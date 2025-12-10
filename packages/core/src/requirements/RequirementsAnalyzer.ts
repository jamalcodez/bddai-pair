import { PRDParser, ParsedPRD } from './PRDParser.js';
import { FeatureExtractor, ExtractedFeature } from './FeatureExtractor.js';
import { ScenarioGenerator, GeneratedScenario, ScenarioGenerationOptions } from './ScenarioGenerator.js';
import { GherkinFeature } from '@bddai/types';

/**
 * Analysis result containing all extracted information
 */
export interface AnalysisResult {
  prd: ParsedPRD;
  features: ExtractedFeature[];
  scenarios: Map<string, GeneratedScenario[]>;
  gherkinFeatures: Map<string, GherkinFeature>;
  summary: {
    totalFeatures: number;
    totalScenarios: number;
    byComplexity: Record<string, number>;
    byPriority: Record<string, number>;
  };
  recommendations: string[];
  validation: ValidationResult;
}

/**
 * Validation result for requirements
 */
export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  score: number;
}

/**
 * Requirements Analyzer - Orchestrates the entire analysis process
 */
export class RequirementsAnalyzer {
  private parser: PRDParser;
  private extractor: FeatureExtractor;
  private generator: ScenarioGenerator;

  constructor() {
    this.parser = new PRDParser();
    this.extractor = new FeatureExtractor();
    this.generator = new ScenarioGenerator();
  }

  /**
   * Analyze a PRD file
   */
  async analyzeFile(
    filePath: string,
    options?: Partial<ScenarioGenerationOptions>
  ): Promise<AnalysisResult> {
    const prd = await this.parser.parseFile(filePath);
    return this.analyzePRD(prd, options);
  }

  /**
   * Analyze PRD content directly
   */
  async analyzeContent(
    content: string,
    options?: Partial<ScenarioGenerationOptions>
  ): Promise<AnalysisResult> {
    const prd = await this.parser.parseContent(content);
    return this.analyzePRD(prd, options);
  }

  /**
   * Main analysis method
   */
  private async analyzePRD(
    prd: ParsedPRD,
    options: Partial<ScenarioGenerationOptions> = {}
  ): Promise<AnalysisResult> {
    // Extract features
    const features = await this.extractor.extractFeatures(prd);

    // Generate scenarios for each feature
    const scenarios = new Map<string, GeneratedScenario[]>();
    const gherkinFeatures = new Map<string, GherkinFeature>();

    for (const feature of features) {
      const featureScenarios = await this.generator.generateScenarios(feature, options);
      scenarios.set(feature.id, featureScenarios);

      const gherkinFeature = await this.generator.generateFeatureFile(feature, featureScenarios);
      gherkinFeatures.set(feature.id, gherkinFeature);
    }

    // Create summary
    const summary = this.createSummary(features, scenarios);

    // Generate recommendations
    const recommendations = this.generateRecommendations(prd, features, scenarios);

    // Validate requirements
    const validation = this.validateRequirements(prd, features);

    return {
      prd,
      features,
      scenarios,
      gherkinFeatures,
      summary,
      recommendations,
      validation,
    };
  }

  /**
   * Create analysis summary
   */
  private createSummary(
    features: ExtractedFeature[],
    scenarios: Map<string, GeneratedScenario[]>
  ) {
    const totalScenarios = Array.from(scenarios.values())
      .reduce((total, scenarioList) => total + scenarioList.length, 0);

    const byComplexity = features.reduce((acc, feature) => {
      acc[feature.complexity] = (acc[feature.complexity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPriority = features.reduce((acc, feature) => {
      acc[feature.priority] = (acc[feature.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalFeatures: features.length,
      totalScenarios,
      byComplexity,
      byPriority,
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    prd: ParsedPRD,
    features: ExtractedFeature[],
    scenarios: Map<string, GeneratedScenario[]>
  ): string[] {
    const recommendations: string[] = [];

    // Check for missing user stories
    const userStoryCount = prd.requirements.filter(r => r.type === 'user-story').length;
    if (userStoryCount === 0) {
      recommendations.push('Consider adding user stories to better capture user perspectives');
    }

    // Check for features without scenarios
    const featuresWithoutScenarios = features.filter(f =>
      !scenarios.has(f.id) || scenarios.get(f.id)!.length === 0
    );

    if (featuresWithoutScenarios.length > 0) {
      recommendations.push(`${featuresWithoutScenarios.length} feature(s) have no test scenarios. Consider adding acceptance criteria`);
    }

    // Check for complexity distribution
    const complexFeatures = features.filter(f => f.complexity === 'complex').length;
    if (complexFeatures > features.length * 0.5) {
      recommendations.push('Many features are marked as complex. Consider breaking them down into smaller features');
    }

    // Check priority distribution
    const highPriorityCount = features.filter(f => f.priority === 'high').length;
    if (highPriorityCount === 0) {
      recommendations.push('No high-priority features identified. Consider which features are most critical');
    }

    // Check for dependencies
    const featuresWithDependencies = features.filter(f => f.dependencies.length > 0);
    if (featuresWithDependencies.length > 0) {
      recommendations.push(`Plan implementation order for ${featuresWithDependencies.length} feature(s) with dependencies`);
    }

    // Check scenario coverage
    const avgScenariosPerFeature = this.createSummary(features, scenarios).totalScenarios / features.length;
    if (avgScenariosPerFeature < 2) {
      recommendations.push('Consider adding more test scenarios to ensure comprehensive coverage');
    }

    // Check for edge cases
    const edgeCaseScenarios = Array.from(scenarios.values())
      .flat()
      .filter(s => s.tags.includes('@edge-case')).length;

    if (edgeCaseScenarios === 0) {
      recommendations.push('Consider adding edge case scenarios to handle boundary conditions');
    }

    return recommendations;
  }

  /**
   * Validate requirements
   */
  private validateRequirements(prd: ParsedPRD, features: ExtractedFeature[]): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    let score = 100;

    // Check for duplicate requirement IDs
    const ids = prd.requirements.map(r => r.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate requirement IDs: ${duplicateIds.join(', ')}`);
      score -= 20;
    }

    // Check for empty requirements
    const emptyRequirements = prd.requirements.filter(r =>
      !r.title || !r.description || r.title.trim().length === 0
    );
    if (emptyRequirements.length > 0) {
      errors.push(`${emptyRequirements.length} requirement(s) have missing titles or descriptions`);
      score -= 15;
    }

    // Check for orphaned acceptance criteria
    const orphanedCriteria = prd.requirements.filter(r =>
      r.type === 'acceptance-criteria' && !r.title
    );
    if (orphanedCriteria.length > 0) {
      warnings.push(`${orphanedCriteria.length} acceptance criteria without parent requirement`);
      score -= 5;
    }

    // Check for very large features
    const largeFeatures = features.filter(f => f.requirements.length > 10);
    if (largeFeatures.length > 0) {
      warnings.push(`${largeFeatures.length} feature(s) have many requirements. Consider breaking them down`);
      score -= 10;
    }

    // Check for missing actors
    const featuresWithoutActors = features.filter(f =>
      f.userFlows.length === 0 || f.userFlows.every(flow => !flow.actor)
    );
    if (featuresWithoutActors.length > 0) {
      warnings.push(`${featuresWithoutActors.length} feature(s) have undefined actors`);
      score -= 5;
    }

    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies(features);
    if (circularDeps.length > 0) {
      warnings.push(`Circular dependencies detected: ${circularDeps.join(' -> ')}`);
      score -= 10;
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      score,
    };
  }

  /**
   * Detect circular dependencies in features
   */
  private detectCircularDependencies(features: ExtractedFeature[]): string[] {
    const dependencyMap = new Map<string, string[]>();
    const circular: string[] = [];

    // Build dependency map
    for (const feature of features) {
      dependencyMap.set(feature.id, feature.dependencies);
    }

    // Check for cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    function dfs(featureId: string, path: string[]): boolean {
      if (recursionStack.has(featureId)) {
        const cycleStart = path.indexOf(featureId);
        circular.push(...path.slice(cycleStart), featureId);
        return true;
      }

      if (visited.has(featureId)) {
        return false;
      }

      visited.add(featureId);
      recursionStack.add(featureId);

      const dependencies = dependencyMap.get(featureId) || [];
      for (const dep of dependencies) {
        if (dfs(dep, [...path, featureId])) {
          return true;
        }
      }

      recursionStack.delete(featureId);
      return false;
    }

    for (const feature of features) {
      if (!visited.has(feature.id)) {
        dfs(feature.id, []);
      }
    }

    return circular;
  }

  /**
   * Export analysis to JSON
   */
  async exportToJSON(result: AnalysisResult): Promise<string> {
    return JSON.stringify(result, null, 2);
  }

  /**
   * Export analysis to markdown report
   */
  async exportToMarkdown(result: AnalysisResult): Promise<string> {
    let markdown = `# Requirements Analysis Report\n\n`;

    // Overview
    markdown += `## Overview\n\n`;
    markdown += `**PRD:** ${result.prd.title}\n`;
    markdown += `**Version:** ${result.prd.version}\n`;
    markdown += `**Total Features:** ${result.summary.totalFeatures}\n`;
    markdown += `**Total Scenarios:** ${result.summary.totalScenarios}\n\n`;

    // Validation Score
    markdown += `**Validation Score:** ${result.validation.score}/100\n\n`;

    // Features Summary
    markdown += `## Features Summary\n\n`;
    markdown += `| Feature | Priority | Complexity | Scenarios |\n`;
    markdown += `|--------|----------|------------|-----------|\n`;

    for (const feature of result.features) {
      const scenarioCount = result.scenarios.get(feature.id)?.length || 0;
      markdown += `| ${feature.name} | ${feature.priority} | ${feature.complexity} | ${scenarioCount} |\n`;
    }

    // Recommendations
    if (result.recommendations.length > 0) {
      markdown += `\n## Recommendations\n\n`;
      result.recommendations.forEach(rec => {
        markdown += `- ${rec}\n`;
      });
    }

    // Validation Issues
    if (result.validation.errors.length > 0 || result.validation.warnings.length > 0) {
      markdown += `\n## Validation Issues\n\n`;

      if (result.validation.errors.length > 0) {
        markdown += `### Errors\n\n`;
        result.validation.errors.forEach(error => {
          markdown += `- ❌ ${error}\n`;
        });
      }

      if (result.validation.warnings.length > 0) {
        markdown += `\n### Warnings\n\n`;
        result.validation.warnings.forEach(warning => {
          markdown += `- ⚠️ ${warning}\n`;
        });
      }
    }

    return markdown;
  }

  /**
   * Export features and scenarios to markdown files in bddai/ directory
   */
  async exportToMarkdownFiles(
    result: AnalysisResult,
    outputDir: string
  ): Promise<{
    reportFile: string;
    featureFiles: string[];
    scenarioFiles: string[];
  }> {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Create bddai directory
    await fs.mkdir(outputDir, { recursive: true });

    // Export analysis report
    const reportFile = path.join(outputDir, 'analysis-report.md');
    const reportContent = await this.exportToMarkdown(result);
    await fs.writeFile(reportFile, reportContent);

    // Export each feature and its scenarios
    const featureFiles: string[] = [];
    const scenarioFiles: string[] = [];

    for (const feature of result.features) {
      const scenarios = result.scenarios.get(feature.id) || [];
      const exported = await this.generator.exportToMarkdown(feature, scenarios, outputDir);

      featureFiles.push(exported.featureFile);
      scenarioFiles.push(...exported.scenarioFiles);
    }

    return {
      reportFile,
      featureFiles,
      scenarioFiles
    };
  }
}