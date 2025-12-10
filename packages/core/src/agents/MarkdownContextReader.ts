import fs from 'fs/promises';
import path from 'path';

/**
 * Utility for reading markdown context from bddai/ directory
 */
export class MarkdownContextReader {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Read project conventions from bddai/project.md
   */
  async readProjectConventions(): Promise<string | null> {
    try {
      const projectMdPath = path.join(this.projectRoot, 'bddai', 'project.md');
      const content = await fs.readFile(projectMdPath, 'utf-8');
      return content;
    } catch (error) {
      console.warn('No project.md found. Run `bddai init` to create project conventions.');
      return null;
    }
  }

  /**
   * Read a feature file
   */
  async readFeature(featureName: string): Promise<string | null> {
    try {
      const featurePath = path.join(
        this.projectRoot,
        'bddai',
        'features',
        `${this.toKebabCase(featureName)}.feature`
      );
      const content = await fs.readFile(featurePath, 'utf-8');
      return content;
    } catch (error) {
      console.warn(`Feature file not found: ${featureName}`);
      return null;
    }
  }

  /**
   * List all available features
   */
  async listFeatures(): Promise<string[]> {
    try {
      const featuresDir = path.join(this.projectRoot, 'bddai', 'features');
      const files = await fs.readdir(featuresDir);
      return files
        .filter(f => f.endsWith('.feature'))
        .map(f => f.replace('.feature', ''));
    } catch (error) {
      return [];
    }
  }

  /**
   * Read all scenarios for a feature
   */
  async readScenarios(featureName: string): Promise<string[]> {
    try {
      const scenariosDir = path.join(
        this.projectRoot,
        'bddai',
        'scenarios',
        this.toKebabCase(featureName)
      );
      const files = await fs.readdir(scenariosDir);

      const scenarios: string[] = [];
      for (const file of files.filter(f => f.endsWith('.md'))) {
        const content = await fs.readFile(path.join(scenariosDir, file), 'utf-8');
        scenarios.push(content);
      }

      return scenarios;
    } catch (error) {
      return [];
    }
  }

  /**
   * Read analysis report
   */
  async readAnalysisReport(): Promise<string | null> {
    try {
      const reportPath = path.join(this.projectRoot, 'bddai', 'analysis-report.md');
      const content = await fs.readFile(reportPath, 'utf-8');
      return content;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract file structure from project.md
   */
  extractFileStructure(projectMd: string): string {
    const match = projectMd.match(/## File Structure\s+```\s+([\s\S]*?)```/);
    return match ? match[1].trim() : '';
  }

  /**
   * Extract naming conventions from project.md
   */
  extractNamingConventions(projectMd: string): string {
    const match = projectMd.match(/## Naming Conventions\s+([\s\S]*?)(?=\n##|$)/);
    return match ? match[1].trim() : '';
  }

  /**
   * Extract code patterns from project.md
   */
  extractCodePatterns(projectMd: string): string {
    const match = projectMd.match(/## Code Patterns\s+([\s\S]*?)(?=\n##|$)/);
    return match ? match[1].trim() : '';
  }

  /**
   * Extract framework info from project.md
   */
  extractFramework(projectMd: string): string {
    const match = projectMd.match(/\*\*Framework:\*\* (.+)/);
    return match ? match[1].trim() : 'Unknown';
  }

  /**
   * Extract tech stack from project.md
   */
  extractTechStack(projectMd: string): string[] {
    const match = projectMd.match(/## Tech Stack\s+([\s\S]*?)(?=\n##)/);
    if (!match) return [];

    return match[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim());
  }

  /**
   * Convert to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
