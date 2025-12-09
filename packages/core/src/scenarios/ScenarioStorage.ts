import {
  GherkinFeature,
  GherkinScenario,
  GherkinBackground,
  GherkinStep,
  ProjectConfig
} from '@bddai/types';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { kebabCase } from 'lodash-es';

/**
 * Handles storage of Gherkin features and scenarios
 */
export class ScenarioStorage {
  private featuresDirectory: string;

  constructor(featuresDirectory: string) {
    this.featuresDirectory = featuresDirectory;

    // Ensure directory exists
    if (!existsSync(featuresDirectory)) {
      mkdirSync(featuresDirectory, { recursive: true });
    }
  }

  /**
   * Check if feature is approved for implementation
   */
  async isFeatureApproved(featurePath: string): Promise<boolean> {
    const approvalPath = featurePath.replace('.feature', '.approved');
    return existsSync(approvalPath);
  }

  /**
   * Create a new feature file
   */
  async createFeature(
    name: string,
    description?: string,
    tags?: string[]
  ): Promise<{ path: string; feature: GherkinFeature }> {
    const fileName = `${kebabCase(name)}.feature`;
    const filePath = join(this.featuresDirectory, fileName);

    const featureContent = this.generateFeatureContent(name, description, tags);
    writeFileSync(filePath, featureContent, 'utf-8');

    const feature: GherkinFeature = {
      uri: filePath,
      name,
      keyword: 'Feature',
      description,
      line: 1,
      tags: tags?.map((tag, index) => ({
        name: tag.startsWith('@') ? tag : `@${tag}`,
        line: 2 + index,
      })) || [],
      scenarios: [],
      scenarioOutlines: [],
    };

    return { path: filePath, feature };
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
    if (!existsSync(featurePath)) {
      throw new Error(`Feature file not found: ${featurePath}`);
    }

    const content = readFileSync(featurePath, 'utf-8');
    const scenarioContent = this.generateScenarioContent(scenarioName, steps, tags);

    // Add scenario to the end of the file
    const updatedContent = content + '\n\n' + scenarioContent;
    writeFileSync(featurePath, updatedContent, 'utf-8');

    // Get the line number where the scenario starts
    const lines = content.split('\n');
    const startLine = lines.length + 2;

    const scenario: GherkinScenario = {
      name: scenarioName,
      keyword: 'Scenario',
      steps: steps.map((step, index) => ({
        keyword: step.keyword,
        text: step.text,
        line: startLine + index + 1,
      })),
      line: startLine,
      tags: tags?.map((tag, index) => ({
        name: tag.startsWith('@') ? tag : `@${tag}`,
        line: startLine + index,
      })) || [],
    };

    return scenario;
  }

  /**
   * Add a background section to a feature
   */
  async addBackground(
    featurePath: string,
    steps: Array<{ keyword: string; text: string }>
  ): Promise<GherkinBackground> {
    if (!existsSync(featurePath)) {
      throw new Error(`Feature file not found: ${featurePath}`);
    }

    const content = readFileSync(featurePath, 'utf-8');

    // Check if background already exists
    if (content.includes('Background:')) {
      throw new Error('Feature already has a background section');
    }

    const backgroundContent = this.generateBackgroundContent(steps);

    // Insert background after the feature description
    const lines = content.split('\n');
    let insertIndex = 1; // After Feature: line

    // Find the end of the feature description
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '' || lines[i].startsWith('@') || lines[i].startsWith('Scenario') || lines[i].startsWith('Background')) {
        insertIndex = i;
        break;
      }
    }

    // @ts-ignore
    lines.splice(insertIndex, 0, '', ...backgroundContent.split('\n'));
    const updatedContent = lines.join('\n');

    writeFileSync(featurePath, updatedContent, 'utf-8');

    const background: GherkinBackground = {
      keyword: 'Background',
      steps: steps.map((step, index) => ({
        keyword: step.keyword,
        text: step.text,
        line: insertIndex + index + 2,
      })),
      line: insertIndex + 1,
    };

    return background;
  }

  /**
   * Read a feature file
   */
  readFeature(featurePath: string): string {
    if (!existsSync(featurePath)) {
      throw new Error(`Feature file not found: ${featurePath}`);
    }
    return readFileSync(featurePath, 'utf-8');
  }

  /**
   * Update a feature file
   */
  updateFeature(featurePath: string, content: string): void {
    if (!existsSync(featurePath)) {
      throw new Error(`Feature file not found: ${featurePath}`);
    }
    writeFileSync(featurePath, content, 'utf-8');
  }

  /**
   * Delete a feature file
   */
  deleteFeature(featurePath: string): void {
    // TODO: Implement file deletion with proper error handling
    // For now, just check if it exists
    if (!existsSync(featurePath)) {
      throw new Error(`Feature file not found: ${featurePath}`);
    }
  }

  /**
   * Generate content for a new feature
   */
  private generateFeatureContent(
    name: string,
    description?: string,
    tags?: string[]
  ): string {
    let content = '';

    // Add tags
    if (tags && tags.length > 0) {
      const formattedTags = tags.map(tag => tag.startsWith('@') ? tag : `@${tag}`).join(' ');
      content += `${formattedTags}\n`;
    }

    // Add feature line
    content += `Feature: ${name}\n`;

    // Add description
    if (description) {
      content += `\n${description}\n`;
    }

    return content;
  }

  /**
   * Generate content for a new scenario
   */
  private generateScenarioContent(
    name: string,
    steps: Array<{ keyword: string; text: string }>,
    tags?: string[]
  ): string {
    let content = '';

    // Add tags
    if (tags && tags.length > 0) {
      const formattedTags = tags.map(tag => tag.startsWith('@') ? tag : `@${tag}`).join(' ');
      content += `  ${formattedTags}\n`;
    }

    // Add scenario line
    content += `  Scenario: ${name}\n`;

    // Add steps
    for (const step of steps) {
      content += `    ${step.keyword} ${step.text}\n`;
    }

    return content.trim();
  }

  /**
   * Generate content for a background section
   */
  private generateBackgroundContent(steps: Array<{ keyword: string; text: string }>): string[] {
    const content: string[] = [];

    content.push('  Background:');

    // Add steps
    for (const step of steps) {
      content.push(`    ${step.keyword} ${step.text}`);
    }

    return content;
  }
}