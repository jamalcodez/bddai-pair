import {
  AIAgent,
  AgentType,
  AgentMessage,
  MessageType,
  AnalyzerAgentConfig,
  AgentCapabilities,
  AgentResponse,
  AnalysisResult,
} from '@bddai/types';
import { randomUUID } from 'crypto';

/**
 * Analyzer Agent - Responsible for analyzing PRDs and breaking them down into features and scenarios
 */
export class AnalyzerAgent implements AIAgent {
  id: string;
  type = AgentType.ANALYZER;
  name: string;
  description: string;
  capabilities: AgentCapabilities;
  private config: AnalyzerAgentConfig;
  private context: Record<string, any> = {};

  constructor(config: AnalyzerAgentConfig = {}) {
    this.id = randomUUID();
    this.name = 'Analyzer Agent';
    this.description = 'AI agent responsible for analyzing PRDs and breaking them down into features and scenarios';
    this.capabilities = {
      canAnalyzeCode: false,
      canWriteCode: false,
      canRunTests: false,
      canReviewCode: false,
      supportedLanguages: ['english'],
      maxTokens: 4000,
    };
    this.config = config;
  }

  async initialize(config: Record<string, any>): Promise<void> {
    this.config = { ...this.config, ...config };
    this.context = {
      analysisHistory: [],
      patterns: [],
      bestPractices: [],
      ...config.initialContext,
    };
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    switch (message.type) {
      case MessageType.PROPOSAL:
        return this.handlePRDAnalysis(message);

      case MessageType.QUESTION:
        return this.handleAnalysisQuestion(message);

      case MessageType.CONTEXT_UPDATE:
        return this.updateContext(message);

      default:
        return null;
    }
  }

  async getContext(): Promise<Record<string, any>> {
    return {
      ...this.context,
      role: 'analyzer',
      capabilities: this.capabilities,
      config: this.config,
    };
  }

  async updateContext(context: Record<string, any>): Promise<void> {
    this.context = { ...this.context, ...context };
  }

  /**
   * Handle PRD analysis request
   */
  private async handlePRDAnalysis(message: AgentMessage): Promise<AgentMessage> {
    const { prdContent, options } = message.payload;

    // Perform analysis
    const analysis = await this.performPRDAnalysis(prdContent, options);

    const response: AgentMessage = {
      id: randomUUID(),
      from: AgentType.ANALYZER,
      to: 'human',
      type: MessageType.PROPOSAL,
      timestamp: new Date(),
      payload: {
        type: 'prd_analysis_complete',
        analysis,
        summary: this.generateAnalysisSummary(analysis),
        nextSteps: [
          'Review generated features and scenarios',
          'Provide feedback or approve for implementation',
          'Proceed to AI pair programming when ready',
        ],
      },
      context: await this.getContext(),
      correlationId: message.id,
    };

    return response;
  }

  /**
   * Handle analysis questions
   */
  private async handleAnalysisQuestion(message: AgentMessage): Promise<AgentMessage> {
    const { question, context } = message.payload;

    let answer: string;
    let suggestions: string[] = [];

    if (question.toLowerCase().includes('feature')) {
      answer = await this.provideFeatureGuidance(question, context);
      suggestions = [
        'Focus on business value',
        'Keep features small and focused',
        'Use user stories to capture needs',
      ];
    } else if (question.toLowerCase().includes('scenario')) {
      answer = await this.provideScenarioGuidance(question, context);
      suggestions = [
        'Follow the Given-When-Then pattern',
        'Include edge cases',
        'Make scenarios independent',
      ];
    } else {
      answer = await this.provideGeneralGuidance(question, context);
    }

    const response: AgentMessage = {
      id: randomUUID(),
      from: AgentType.ANALYZER,
      to: message.from,
      type: MessageType.ANSWER,
      timestamp: new Date(),
      payload: {
        answer,
        suggestions,
        examples: this.generateExamples(question, context),
      },
      context: await this.getContext(),
      correlationId: message.id,
    };

    return response;
  }

  /**
   * Update context from incoming message
   */
  private async updateContext(message: AgentMessage): Promise<AgentMessage> {
    await this.updateContext(message.context);

    return {
      id: randomUUID(),
      from: AgentType.ANALYZER,
      to: message.from,
      type: MessageType.CONTEXT_UPDATE,
      timestamp: new Date(),
      payload: {
        acknowledged: true,
        updatedKeys: Object.keys(message.context),
      },
      context: await this.getContext(),
      correlationId: message.id,
    };
  }

  /**
   * Perform PRD analysis
   */
  private async performPRDAnalysis(prdContent: string, options: any): Promise<any> {
    // Import here to avoid circular dependencies
    const { RequirementsAnalyzer } = await import('./../requirements/RequirementsAnalyzer.js');
    const analyzer = new RequirementsAnalyzer();

    try {
      const result = await analyzer.analyzeContent(prdContent, options);
      return result;
    } catch (error) {
      console.error('Analysis failed:', error);
      return {
        error: error.message,
        prdContent,
        features: [],
        scenarios: new Map(),
      };
    }
  }

  /**
   * Generate analysis summary
   */
  private generateAnalysisSummary(analysis: AnalysisResult): string {
    const { features, summary, validation } = analysis;

    let summaryText = `Analysis complete! Found ${features.length} features with ${summary.totalScenarios} scenarios.\n\n`;
    summaryText += `Validation Score: ${validation.score}/100`;

    if (validation.warnings.length > 0) {
      summaryText += `\nWarnings: ${validation.warnings.length}`;
    }

    if (validation.errors.length > 0) {
      summaryText += `\nErrors: ${validation.errors.length}`;
    }

    return summaryText;
  }

  /**
   * Provide feature guidance
   */
  private async provideFeatureGuidance(question: string, context: any): Promise<string> {
    return `When analyzing features, I look for clear user value and business objectives. Good features are:

1. **User-focused**: Clearly state who benefits and why
2. **Small and focused**: One primary capability per feature
3. **Independent**: Can be developed and tested separately
4. **Testable**: Has clear acceptance criteria

Try to structure your requirements using user stories (As a [role], I want [goal] so that [value]) and acceptance criteria for each feature.`;
  }

  /**
   * Provide scenario guidance
   */
  private async provideScenarioGuidance(question: string, context: any): Promise<string> {
    return `For effective scenarios, use the Gherkin format:

**Structure:**
- **Given**: Set up the initial state
- **When**: Describe the action
- **Then**: Define the expected outcome
- **And**: Add additional outcomes

**Best Practices:**
- Use declarative language
- One outcome per Then/And step
- Include edge cases (empty states, errors)
- Make scenarios independent and reusable

I automatically generate scenarios including:
- Happy path scenarios
- Error handling
- Edge cases
- Integration points`;
  }

  /**
   * Provide general guidance
   */
  private async provideGeneralGuidance(question: string, context: any): Promise<string> {
    return `I specialize in analyzing requirements and breaking them down into actionable development items. Here's how I can help:

**Analysis Services:**
- PRD parsing and structure validation
- Feature identification and extraction
- Scenario generation from user stories
- Requirements quality assessment
- Dependency and impact analysis

**Quality Indicators:**
- Clear user stories and acceptance criteria
- Well-defined feature boundaries
- Comprehensive test coverage
- Identified risks and dependencies

Feel free to ask me about specific aspects of your requirements!`;
  }

  /**
   * Generate examples
   */
  private generateExamples(question: string, context: any): string[] {
    if (question.toLowerCase().includes('user story')) {
      return [
        'As a shopper, I want to add items to my cart so that I can purchase later',
        'As an admin, I want to view user reports so that I can track activity',
        'As a user, I want to reset my password so that I can regain access',
      ];
    }

    if (question.toLowerCase().includes('scenario')) {
      return [
        'Scenario: Successful login\nGiven a registered user\nWhen they enter valid credentials\nThen they are logged in',
        'Scenario: Password reset\nGiven a user requests password reset\nWhen they follow the reset link\nThen they can set a new password',
      ];
    }

    return [];
  }
}