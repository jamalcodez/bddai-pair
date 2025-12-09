import { ParsedPRD, ParsedRequirement } from './PRDParser.js';

/**
 * Extracted feature with related requirements
 */
export interface ExtractedFeature {
  id: string;
  name: string;
  description: string;
  requirements: ParsedRequirement[];
  dependencies: string[];
  priority: 'high' | 'medium' | 'low';
  complexity: 'simple' | 'medium' | 'complex';
  estimatedScenarios: number;
  userFlows: UserFlow[];
}

/**
 * User flow within a feature
 */
export interface UserFlow {
  id: string;
  name: string;
  description: string;
  steps: string[];
  actor: string;
}

/**
 * Feature Extraction Engine - Groups requirements into logical features
 */
export class FeatureExtractor {
  /**
   * Extract features from parsed PRD
   */
  async extractFeatures(prd: ParsedPRD): Promise<ExtractedFeature[]> {
    const features: ExtractedFeature[] = [];

    // Group requirements by themes and relationships
    const requirementGroups = this.groupRequirements(prd.requirements);

    // Convert each group to a feature
    for (const [theme, requirements] of requirementGroups) {
      const feature = await this.createFeature(theme, requirements);
      features.push(feature);
    }

    // Add standalone requirements as features
    const allGroupedReqs: any[] = [];
    // @ts-ignore - TODO: Fix type mismatch
    groupedFeatures.forEach(group => allGroupedReqs.push(...group));
    const standaloneRequirements = prd.requirements.filter((req: any) =>
      !allGroupedReqs.includes(req)
    );

    for (const requirement of standaloneRequirements) {
      const feature = await this.createFeatureFromRequirement(requirement);
      features.push(feature);
    }

    // Sort by priority
    features.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    return features;
  }

  /**
   * Group related requirements
   */
  private groupRequirements(requirements: ParsedRequirement[]): Map<string, ParsedRequirement[]> {
    const groups = new Map<string, ParsedRequirement[]>();
    const processed = new Set<ParsedRequirement>();

    // First, group explicit features
    const explicitFeatures = requirements.filter(req => req.type === 'feature');
    for (const feature of explicitFeatures) {
      groups.set(feature.title, [feature]);
      processed.add(feature);

      // Find related requirements
      const related = this.findRelatedRequirements(feature, requirements);
      for (const req of related) {
        if (!processed.has(req)) {
          groups.get(feature.title)!.push(req);
          processed.add(req);
        }
      }
    }

    // Group remaining requirements by themes
    const remaining = requirements.filter(req => !processed.has(req));
    const themes = this.identifyThemes(remaining);

    for (const [theme, themeRequirements] of themes) {
      groups.set(theme, themeRequirements);
      themeRequirements.forEach(req => processed.add(req));
    }

    return groups;
  }

  /**
   * Find requirements related to a feature
   */
  private findRelatedRequirements(feature: ParsedRequirement, allRequirements: ParsedRequirement[]): ParsedRequirement[] {
    const related: ParsedRequirement[] = [];
    const keywords = this.extractKeywords(feature);

    for (const req of allRequirements) {
      if (req === feature) continue;

      const reqKeywords = this.extractKeywords(req);
      const similarity = this.calculateSimilarity(keywords, reqKeywords);

      if (similarity > 0.3) { // 30% similarity threshold
        related.push(req);
      }
    }

    return related;
  }

  /**
   * Identify themes from requirements
   */
  private identifyThemes(requirements: ParsedRequirement[]): Map<string, ParsedRequirement[]> {
    const themes = new Map<string, ParsedRequirement[]>();
    const used = new Set<ParsedRequirement>();

    for (const req of requirements) {
      if (used.has(req)) continue;

      // Create theme from main action/verb
      const theme = this.extractTheme(req);
      if (!themes.has(theme)) {
        themes.set(theme, []);
      }

      themes.get(theme)!.push(req);
      used.add(req);

      // Find similar requirements
      for (const other of requirements) {
        if (used.has(other)) continue;

        const reqKeywords = this.extractKeywords(req);
        const otherKeywords = this.extractKeywords(other);
        const similarity = this.calculateSimilarity(reqKeywords, otherKeywords);

        if (similarity > 0.4) { // 40% similarity for same theme
          themes.get(theme)!.push(other);
          used.add(other);
        }
      }
    }

    return themes;
  }

  /**
   * Create feature from requirement group
   */
  private async createFeature(theme: string, requirements: ParsedRequirement[]): Promise<ExtractedFeature> {
    const featureRequirements = requirements.filter(req => req.type !== 'acceptance-criteria');
    const acceptanceCriteria = requirements
      .filter(req => req.type === 'acceptance-criteria')
      .map(req => req.description);

    // Determine priority
    const priority = this.determinePriority(requirements);

    // Estimate complexity
    const complexity = this.estimateComplexity(requirements);

    // Extract user flows
    const userFlows = this.extractUserFlows(requirements);

    return {
      id: `FEAT-${theme.replace(/\s+/g, '-').toUpperCase()}`,
      name: this.sanitizeFeatureName(theme),
      description: this.generateDescription(theme, requirements),
      requirements: featureRequirements,
      dependencies: this.extractDependencies(requirements),
      priority,
      complexity,
      estimatedScenarios: this.estimateScenarios(requirements, userFlows),
      userFlows,
    };
  }

  /**
   * Create feature from single requirement
   */
  private async createFeatureFromRequirement(requirement: ParsedRequirement): Promise<ExtractedFeature> {
    const theme = requirement.title || requirement.goal || 'General';
    const userFlows = requirement.type === 'user-story'
      ? [this.createUserFlowFromStory(requirement)]
      : [];

    return {
      id: `FEAT-${requirement.id}`,
      name: this.sanitizeFeatureName(theme),
      description: requirement.description,
      requirements: [requirement],
      dependencies: requirement.dependencies || [],
      priority: requirement.priority,
      complexity: 'medium',
      estimatedScenarios: 1,
      userFlows,
    };
  }

  /**
   * Extract keywords from requirement
   */
  private extractKeywords(requirement: ParsedRequirement): string[] {
    const text = `${requirement.title} ${requirement.description} ${requirement.goal || ''}`;
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word));

    // Remove duplicates
    return [...new Set(words)];
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
      'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
      'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they',
      'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
      'one', 'all', 'would', 'there', 'their', 'what', 'so',
      'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
      'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just',
      'him', 'know', 'take', 'people', 'into', 'year', 'your',
      'good', 'some', 'could', 'them', 'see', 'other', 'than',
      'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think',
      'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work',
      'first', 'well', 'way', 'even', 'new', 'want', 'because',
      'any', 'these', 'give', 'day', 'most', 'us', 'is', 'was',
      'are', 'been', 'has', 'had', 'were', 'said', 'did', 'getting',
      'made', 'find', 'where', 'much', 'too', 'very', 'still',
      'being', 'going', 'why', 'before', 'never', 'here', 'more'
    ]);

    return stopWords.has(word);
  }

  /**
   * Calculate similarity between two keyword sets
   */
  private calculateSimilarity(keywords1: string[], keywords2: string[]): number {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Extract theme from requirement
   */
  private extractTheme(requirement: ParsedRequirement): string {
    // For user stories, use the goal
    if (requirement.type === 'user-story' && requirement.goal) {
      return requirement.goal.split(' ')[0]; // First word of goal
    }

    // For features, use the title
    if (requirement.type === 'feature') {
      return requirement.title;
    }

    // For others, extract the main action/verb
    const words = requirement.title.split(' ');
    const verbs = words.filter(word =>
      word.endsWith('e') || word.endsWith('ed') || word.endsWith('ing')
    );

    return verbs[0] || words[0] || 'General';
  }

  /**
   * Sanitize feature name
   */
  private sanitizeFeatureName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generate feature description
   */
  private generateDescription(theme: string, requirements: ParsedRequirement[]): string {
    const descriptions = requirements
      .filter(req => req.description)
      .map(req => req.description)
      .slice(0, 3);

    return descriptions.join(' ') || `Feature related to ${theme}`;
  }

  /**
   * Determine overall priority
   */
  private determinePriority(requirements: ParsedRequirement[]): 'high' | 'medium' | 'low' {
    const priorities = requirements.map(req => req.priority);

    if (priorities.includes('high')) return 'high';
    if (priorities.includes('medium')) return 'medium';
    return 'low';
  }

  /**
   * Estimate complexity
   */
  private estimateComplexity(requirements: ParsedRequirement[]): 'simple' | 'medium' | 'complex' {
    const count = requirements.length;
    const hasDependencies = requirements.some(req => req.dependencies && req.dependencies.length > 0);
    const hasMultipleActors = new Set(
      requirements
        .filter(req => req.actor)
        .map(req => req.actor)
    ).size > 1;

    if (count > 5 || hasDependencies || hasMultipleActors) {
      return 'complex';
    } else if (count > 2) {
      return 'medium';
    }
    return 'simple';
  }

  /**
   * Extract user flows from requirements
   */
  private extractUserFlows(requirements: ParsedRequirement[]): UserFlow[] {
    const flows: UserFlow[] = [];

    for (const req of requirements) {
      if (req.type === 'user-story' && req.actor && req.goal) {
        flows.push(this.createUserFlowFromStory(req));
      }

      // Extract flows from acceptance criteria
      if (req.acceptanceCriteria) {
        for (let i = 0; i < req.acceptanceCriteria.length; i++) {
          const criteria = req.acceptanceCriteria[i];
          const steps = this.parseCriteriaIntoSteps(criteria);

          if (steps.length > 1) {
            flows.push({
              id: `${req.id}-flow-${i}`,
              name: `Flow for ${req.title}`,
              description: criteria,
              steps,
              actor: req.actor || 'User',
            });
          }
        }
      }
    }

    return flows;
  }

  /**
   * Create user flow from user story
   */
  private createUserFlowFromStory(story: ParsedRequirement): UserFlow {
    return {
      id: `${story.id}-flow`,
      name: story.goal || 'User Flow',
      description: story.description,
      steps: [
        `User initiates action`,
        story.goal || 'Complete goal',
        story.value || 'Achieve value'
      ],
      actor: story.actor || 'User',
    };
  }

  /**
   * Parse acceptance criteria into steps
   */
  private parseCriteriaIntoSteps(criteria: string): string[] {
    // Split by common separators
    const steps = criteria
      .split(/(?:when|then|and|given)\s+/gi)
      .map(step => step.trim())
      .filter(step => step.length > 0);

    // If no good splits, split by punctuation
    if (steps.length === 1) {
      return criteria
        .split(/[.!?]/)
        .map(step => step.trim())
        .filter(step => step.length > 0);
    }

    return steps;
  }

  /**
   * Extract dependencies
   */
  private extractDependencies(requirements: ParsedRequirement[]): string[] {
    const dependencies = new Set<string>();

    for (const req of requirements) {
      if (req.dependencies) {
        req.dependencies.forEach(dep => dependencies.add(dep));
      }
    }

    return Array.from(dependencies);
  }

  /**
   * Estimate number of scenarios needed
   */
  private estimateScenarios(requirements: ParsedRequirement[], userFlows: UserFlow[]): number {
    // Base estimate from requirements
    let estimate = requirements.length;

    // Add scenarios for complex user flows
    const complexFlows = userFlows.filter(flow => flow.steps.length > 3);
    estimate += complexFlows.length;

    // Add scenarios for acceptance criteria
    const criteriaCount = requirements.reduce((total, req) =>
      total + (req.acceptanceCriteria?.length || 0), 0
    );
    estimate += Math.ceil(criteriaCount / 3); // Group criteria into scenarios

    return Math.max(estimate, 1);
  }
}