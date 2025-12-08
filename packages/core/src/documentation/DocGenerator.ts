import { GherkinDocument, GherkinFeature } from '@bddai/types';

/**
 * Generates living documentation from Gherkin features
 */
export class DocGenerator {
  async generateDocumentation(features: GherkinDocument[]): Promise<string> {
    // TODO: Implement documentation generator
    return '# Documentation\n\nTODO: Generate from features';
  }
}