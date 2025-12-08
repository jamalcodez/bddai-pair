import { readFileSync, existsSync } from 'fs';

/**
 * Parsed requirement structure
 */
export interface ParsedRequirement {
  id: string;
  title: string;
  description: string;
  type: 'user-story' | 'feature' | 'requirement' | 'acceptance-criteria';
  priority: 'high' | 'medium' | 'low';
  actor?: string;
  goal?: string;
  value?: string;
  acceptanceCriteria?: string[];
  dependencies?: string[];
  tags?: string[];
}

/**
 * Parsed PRD structure
 */
export interface ParsedPRD {
  title: string;
  description: string;
  version: string;
  author?: string;
  stakeholders?: string[];
  requirements: ParsedRequirement[];
  metadata: {
    totalRequirements: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  };
}

/**
 * PRD Parser - Analyzes and parses natural language requirements documents
 */
export class PRDParser {
  /**
   * Parse a PRD file
   */
  async parseFile(filePath: string): Promise<ParsedPRD> {
    if (!existsSync(filePath)) {
      throw new Error(`PRD file not found: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf-8');
    return this.parseContent(content, filePath);
  }

  /**
   * Parse PRD content from string
   */
  async parseContent(content: string, source?: string): Promise<ParsedPRD> {
    const lines = content.split('\n');
    const requirements: ParsedRequirement[] = [];

    // Extract metadata
    const metadata = this.extractMetadata(lines);

    // Extract requirements using various patterns
    const userStories = this.extractUserStories(lines);
    const features = this.extractFeatures(lines);
    const requirementsList = this.extractRequirements(lines);

    // Merge all requirements
    requirements.push(...userStories, ...features, ...requirementsList);

    // Generate IDs
    requirements.forEach((req, index) => {
      req.id = req.id || `REQ-${String(index + 1).padStart(3, '0')}`;
    });

    return {
      title: metadata.title || 'Untitled PRD',
      description: metadata.description || '',
      version: metadata.version || '1.0.0',
      author: metadata.author,
      stakeholders: metadata.stakeholders,
      requirements,
      metadata: {
        totalRequirements: requirements.length,
        byType: this.groupByType(requirements),
        byPriority: this.groupByPriority(requirements),
      },
    };
  }

  /**
   * Extract metadata from PRD
   */
  private extractMetadata(lines: string[]) {
    const metadata: any = {};

    for (const line of lines) {
      // Title patterns
      if (line.match(/^#\s+(.+)/)) {
        metadata.title = line.match(/^#\s+(.+)/)![1];
      }

      // Version patterns
      if (line.match(/version\s*:?\s*(.+)/i)) {
        metadata.version = line.match(/version\s*:?\s*(.+)/i)![1];
      }

      // Author patterns
      if (line.match(/author\s*:?\s*(.+)/i)) {
        metadata.author = line.match(/author\s*:?\s*(.+)/i)![1];
      }

      // Description (first paragraph after title)
      if (!metadata.description && metadata.title && line.trim()) {
        const descriptionStart = lines.indexOf(line);
        let description = '';

        for (let i = descriptionStart; i < lines.length; i++) {
          if (lines[i].startsWith('#')) break;
          description += lines[i] + '\n';
        }

        metadata.description = description.trim();
      }
    }

    return metadata;
  }

  /**
   * Extract user stories using "As a..." pattern
   */
  private extractUserStories(lines: string[]): ParsedRequirement[] {
    const stories: ParsedRequirement[] = [];
    const content = lines.join('\n');
    const userStoryRegex = /As an?\s+(.+?)\s*,\s*I want to\s+(.+?)(?:\s*,\s*so that\s+(.+?))?\.?$/gmi;

    let match;
    while ((match = userStoryRegex.exec(content)) !== null) {
      const story: ParsedRequirement = {
        id: '',
        title: `User Story: ${match[2]}`,
        description: match[0],
        type: 'user-story',
        priority: 'medium',
        actor: match[1].trim(),
        goal: match[2].trim(),
        value: match[3]?.trim(),
        tags: ['user-story'],
      };

      stories.push(story);
    }

    return stories;
  }

  /**
   * Extract features using bullet points or numbered lists
   */
  private extractFeatures(lines: string[]): ParsedRequirement[] {
    const features: ParsedRequirement[] = [];
    let currentFeature: Partial<ParsedRequirement> | null = null;
    let inFeature = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Feature heading
      if (line.startsWith('Feature:') || line.match(/^###?\s*Feature[:\s]/i)) {
        if (currentFeature && inFeature) {
          features.push(currentFeature as ParsedRequirement);
        }

        currentFeature = {
          id: '',
          title: line.replace(/^###?\s*Feature[:\s]\s*/i, ''),
          type: 'feature',
          priority: 'medium',
          acceptanceCriteria: [],
          tags: ['feature'],
        };
        inFeature = true;
      }

      // Acceptance criteria
      if (inFeature && currentFeature && (line.match(/^-\s+/) || line.match(/^\d+\.\s+/))) {
        const criterion = line.replace(/^[-\d.]+\s+/, '');
        currentFeature.acceptanceCriteria!.push(criterion);
      }

      // Description lines
      if (inFeature && currentFeature && line && !line.startsWith('#') &&
          !line.startsWith('-') && !line.match(/^\d+\./) &&
          !line.startsWith('Feature:')) {
        currentFeature.description = (currentFeature.description || '') + line + ' ';
      }
    }

    // Don't forget the last feature
    if (currentFeature && inFeature) {
      features.push(currentFeature as ParsedRequirement);
    }

    return features;
  }

  /**
   * Extract requirements from lists
   */
  private extractRequirements(lines: string[]): ParsedRequirement[] {
    const requirements: ParsedRequirement[] = [];
    const requirementRegex = /^-\s+(.+?)\s*[:=]\s*(.+)/;
    const priorityRegex = /\[(high|medium|low)\]/i;

    for (const line of lines) {
      if (requirementRegex.test(line)) {
        const match = line.match(requirementRegex)!;
        const priorityMatch = line.match(priorityRegex);

        const requirement: ParsedRequirement = {
          id: '',
          title: match[1].trim(),
          description: match[2].trim(),
          type: 'requirement',
          priority: (priorityMatch ? priorityMatch[1].toLowerCase() : 'medium') as any,
          tags: ['requirement'],
        };

        requirements.push(requirement);
      }
    }

    return requirements;
  }

  /**
   * Group requirements by type
   */
  private groupByType(requirements: ParsedRequirement[]): Record<string, number> {
    return requirements.reduce((acc, req) => {
      acc[req.type] = (acc[req.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Group requirements by priority
   */
  private groupByPriority(requirements: ParsedRequirement[]): Record<string, number> {
    return requirements.reduce((acc, req) => {
      acc[req.priority] = (acc[req.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}