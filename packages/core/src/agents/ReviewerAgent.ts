import {
  AIAgent,
  AgentType,
  AgentMessage,
  MessageType,
  AgentCapabilities,
  ReviewerAgentConfig,
} from '@bddai/types';
import { randomUUID } from 'crypto';
import { MarkdownContextReader } from './MarkdownContextReader.js';

/**
 * Reviewer Agent - Responsible for reviewing code, scenarios, and providing feedback
 */
export class ReviewerAgent implements AIAgent {
  id: string;
  type = AgentType.REVIEWER;
  name: string;
  description: string;
  capabilities: AgentCapabilities;
  private config: ReviewerAgentConfig;
  private context: Record<string, any> = {};
  private contextReader: MarkdownContextReader;

  constructor(config: ReviewerAgentConfig = {}) {
    this.id = randomUUID();
    this.name = 'Reviewer Agent';
    this.description = 'AI agent responsible for reviewing code, scenarios, and providing constructive feedback';
    this.capabilities = {
      canAnalyzeCode: true,
      canWriteCode: false,
      canRunTests: false,
      canReviewCode: true,
      supportedLanguages: ['typescript', 'javascript', 'python', 'java'],
      maxTokens: 4000,
    };
    this.config = config;
    this.contextReader = new MarkdownContextReader(config.projectRoot);
  }

  async initialize(config: Record<string, any>): Promise<void> {
    this.config = { ...this.config, ...config };

    // Load project conventions from markdown
    const projectConventions = await this.contextReader.readProjectConventions();

    this.context = {
      reviewHistory: [],
      patterns: [],
      bestPractices: [],
      projectConventions,
      fileStructure: projectConventions
        ? this.contextReader.extractFileStructure(projectConventions)
        : null,
      namingConventions: projectConventions
        ? this.contextReader.extractNamingConventions(projectConventions)
        : null,
      codePatterns: projectConventions
        ? this.contextReader.extractCodePatterns(projectConventions)
        : null,
      framework: projectConventions
        ? this.contextReader.extractFramework(projectConventions)
        : 'Unknown',
      techStack: projectConventions
        ? this.contextReader.extractTechStack(projectConventions)
        : [],
      ...config.initialContext,
    };
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    switch (message.type) {
      case MessageType.PROPOSAL:
        return this.handleReviewRequest(message);

      case MessageType.QUESTION:
        return this.handleReviewQuestion(message);

      case MessageType.CONTEXT_UPDATE:
        await this.handleContextUpdate(message);
        return null;

      default:
        return null;
    }
  }

  async getContext(): Promise<Record<string, any>> {
    return {
      ...this.context,
      role: 'reviewer',
      capabilities: this.capabilities,
      config: this.config,
    };
  }

  async updateContext(context: Record<string, any>): Promise<void> {
    this.context = { ...this.context, ...context };
  }

  /**
   * Handle code/scenario review request
   */
  private async handleReviewRequest(message: AgentMessage): Promise<AgentMessage> {
    const { code, scenarios, type } = message.payload;

    let review;
    if (type === 'code') {
      review = await this.reviewCode(code);
    } else if (type === 'scenario') {
      review = await this.reviewScenarios(scenarios);
    } else {
      review = await this.reviewImplementation(code, scenarios);
    }

    const response: AgentMessage = {
      id: randomUUID(),
      from: AgentType.REVIEWER,
      to: message.from,
      type: MessageType.IMPLEMENTATION,
      timestamp: new Date(),
      context: await this.getContext(),
      payload: {
        type: 'review_complete',
        review,
        suggestions: review.suggestions,
        issues: review.issues,
        approval: review.approved,
        reviewFocus: this.config.reviewFocus,
        severity: this.config.severity,
      },
    };

    return response;
  }

  /**
   * Handle review-related questions
   */
  private async handleReviewQuestion(message: AgentMessage): Promise<AgentMessage> {
    const { question } = message.payload;

    const response: AgentMessage = {
      id: randomUUID(),
      from: AgentType.REVIEWER,
      to: message.from,
      type: MessageType.QUESTION,
      timestamp: new Date(),
      context: await this.getContext(),
      payload: {
        type: 'review_answer',
        answer: `I can help review: ${question}. Please provide the code or scenarios.`,
      },
    };

    return response;
  }

  /**
   * Handle context updates
   */
  private async handleContextUpdate(message: AgentMessage): Promise<void> {
    const updates = message.payload;
    await this.updateContext(updates);
  }

  /**
   * Review code implementation
   */
  private async reviewCode(_code: string): Promise<any> {
    return {
      approved: true,
      issues: [],
      suggestions: [
        'Consider adding error handling',
        'Add input validation',
        'Include unit tests',
      ],
      quality: {
        readability: 0.8,
        maintainability: 0.75,
        testability: 0.7,
      },
    };
  }

  /**
   * Review BDD scenarios
   */
  private async reviewScenarios(scenarios: any[]): Promise<any> {
    const issues = [];
    const suggestions = [];

    for (const scenario of scenarios) {
      // Check scenario structure
      if (!scenario.steps || scenario.steps.length === 0) {
        issues.push({
          scenario: scenario.name,
          issue: 'No steps defined',
          severity: 'high',
        });
      }

      // Check for Given/When/Then pattern
      const hasGiven = scenario.steps.some((s: any) => s.keyword === 'Given');
      const hasWhen = scenario.steps.some((s: any) => s.keyword === 'When');
      const hasThen = scenario.steps.some((s: any) => s.keyword === 'Then');

      if (!hasGiven || !hasWhen || !hasThen) {
        suggestions.push({
          scenario: scenario.name,
          suggestion: 'Ensure Given/When/Then structure is complete',
        });
      }
    }

    return {
      approved: issues.length === 0,
      issues,
      suggestions,
      quality: {
        completeness: 0.85,
        clarity: 0.8,
        testability: 0.9,
      },
    };
  }

  /**
   * Review implementation against scenarios
   */
  private async reviewImplementation(code: string, scenarios: any[]): Promise<any> {
    const codeReview = await this.reviewCode(code);
    const scenarioReview = await this.reviewScenarios(scenarios);

    return {
      approved: codeReview.approved && scenarioReview.approved,
      issues: [...codeReview.issues, ...scenarioReview.issues],
      suggestions: [...codeReview.suggestions, ...scenarioReview.suggestions],
      quality: {
        overall: 0.8,
        codeQuality: codeReview.quality,
        scenarioQuality: scenarioReview.quality,
        alignment: 0.85, // How well code matches scenarios
      },
    };
  }
}
