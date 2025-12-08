import { GherkinStep, StepPattern } from '@bddai/types';

/**
 * Registry for managing step definitions and patterns
 */
export class StepRegistry {
  private patterns: Map<string, StepPattern> = new Map();
  private patternsByType: Map<string, string[]> = new Map();

  /**
   * Register a step pattern
   */
  register(id: string, pattern: StepPattern): void {
    this.patterns.set(id, pattern);

    // Index by type
    const typePatterns = this.patternsByType.get(pattern.type) || [];
    typePatterns.push(id);
    this.patternsByType.set(pattern.type, typePatterns);
  }

  /**
   * Unregister a step pattern
   */
  unregister(id: string): boolean {
    const pattern = this.patterns.get(id);
    if (!pattern) {
      return false;
    }

    this.patterns.delete(id);

    // Remove from type index
    const typePatterns = this.patternsByType.get(pattern.type) || [];
    const index = typePatterns.indexOf(id);
    if (index > -1) {
      typePatterns.splice(index, 1);
    }

    return true;
  }

  /**
   * Check if a step has a matching pattern
   */
  hasMatchingPattern(step: GherkinStep): boolean {
    return this.findMatchingPattern(step) !== undefined;
  }

  /**
   * Find a pattern that matches a step
   */
  findMatchingPattern(step: GherkinStep): StepPattern | undefined {
    for (const pattern of this.patterns.values()) {
      const match = step.text.match(pattern.pattern);
      if (match) {
        return pattern;
      }
    }
    return undefined;
  }

  /**
   * Get all patterns for a specific type
   */
  getPatternsByType(type: 'given' | 'when' | 'then' | 'and' | 'but'): StepPattern[] {
    const patternIds = this.patternsByType.get(type) || [];
    return patternIds.map(id => this.patterns.get(id)!).filter(Boolean);
  }

  /**
   * Get all registered patterns
   */
  getAllPatterns(): Map<string, StepPattern> {
    return new Map(this.patterns);
  }

  /**
   * Get pattern by ID
   */
  getPattern(id: string): StepPattern | undefined {
    return this.patterns.get(id);
  }

  /**
   * Update a pattern
   */
  updatePattern(id: string, pattern: Partial<StepPattern>): boolean {
    const existing = this.patterns.get(id);
    if (!existing) {
      return false;
    }

    const updated = { ...existing, ...pattern };
    this.patterns.set(id, updated);
    return true;
  }

  /**
   * Clear all patterns
   */
  clear(): void {
    this.patterns.clear();
    this.patternsByType.clear();
  }

  /**
   * Get statistics about registered patterns
   */
  getStatistics(): {
    total: number;
    byType: Record<string, number>;
  } {
    const stats = {
      total: this.patterns.size,
      byType: {} as Record<string, number>,
    };

    for (const [type, patternIds] of this.patternsByType) {
      stats.byType[type] = patternIds.length;
    }

    return stats;
  }
}