import {
  AIAgent,
  AgentType,
  AgentMessage,
  MessageType,
  DriverAgentConfig,
  AgentCapabilities,
  AgentResponse,
  GherkinScenario,
  GherkinFeature,
} from '@bddai/types';
import { randomUUID } from 'crypto';

/**
 * Driver Agent - Responsible for architecture, planning, and design decisions
 */
export class DriverAgent implements AIAgent {
  id: string;
  type = AgentType.DRIVER;
  name: string;
  description: string;
  capabilities: AgentCapabilities;
  private config: DriverAgentConfig;
  private context: Record<string, any> = {};

  constructor(config: DriverAgentConfig = {}) {
    this.id = randomUUID();
    this.name = 'Driver Agent';
    this.description = 'AI agent responsible for architecture, planning, and design decisions';
    this.capabilities = {
      canAnalyzeCode: true,
      canWriteCode: true,
      canRunTests: false,
      canReviewCode: true,
      supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'go'],
      maxTokens: 4000,
    };
    this.config = config;
  }

  async initialize(config: Record<string, any>): Promise<void> {
    this.config = { ...this.config, ...config };
    this.context = {
      architecture: {},
      patterns: [],
      decisions: [],
      ...config.initialContext,
    };
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    switch (message.type) {
      case MessageType.PROPOSAL:
        return this.handleProposal(message);

      case MessageType.QUESTION:
        return this.handleQuestion(message);

      case MessageType.IMPLEMENTATION:
        return this.reviewImplementation(message);

      case MessageType.CONTEXT_UPDATE:
        return this.handleContextUpdate(message);

      default:
        return null;
    }
  }

  async getContext(): Promise<Record<string, any>> {
    return {
      ...this.context,
      role: 'driver',
      capabilities: this.capabilities,
      config: this.config,
    };
  }

  async updateContext(context: Record<string, any>): Promise<void> {
    this.context = { ...this.context, ...context };
  }

  /**
   * Handle a proposal for a new feature or scenario
   */
  private async handleProposal(message: AgentMessage): Promise<AgentMessage> {
    const { scenario, feature } = message.payload;

    // Analyze the scenario and propose architecture
    const architecture = await this.analyzeAndProposeArchitecture(scenario, feature);

    const response: AgentMessage = {
      id: randomUUID(),
      from: AgentType.DRIVER,
      to: AgentType.NAVIGATOR,
      type: MessageType.PROPOSAL,
      timestamp: new Date(),
      payload: {
        type: 'architecture_proposal',
        scenario: scenario.name,
        architecture,
        design: {
          components: architecture.components,
          relationships: architecture.relationships,
          patterns: this.recommendPatterns(scenario),
          constraints: this.identifyConstraints(scenario),
        },
        nextSteps: [
          'Review proposed architecture',
          'Identify required components',
          'Plan implementation order',
        ],
      },
      context: await this.getContext(),
      correlationId: message.id,
    };

    return response;
  }

  /**
   * Handle questions from navigator or reviewer
   */
  private async handleQuestion(message: AgentMessage): Promise<AgentMessage> {
    const { question, context } = message.payload;

    let answer: string;
    let suggestions: string[] = [];

    // Process different types of questions
    if (question.toLowerCase().includes('architecture')) {
      answer = await this.answerArchitectureQuestion(question, context);
      suggestions = [
        'Consider microservices pattern for scalability',
        'Apply SOLID principles for maintainability',
        'Use dependency injection for testability',
      ];
    } else if (question.toLowerCase().includes('pattern')) {
      answer = await this.answerPatternQuestion(question, context);
      suggestions = this.recommendPatterns(context?.scenario);
    } else {
      answer = await this.generateGeneralResponse(question, context);
    }

    const response: AgentMessage = {
      id: randomUUID(),
      from: AgentType.DRIVER,
      to: message.from,
      type: MessageType.ANSWER,
      timestamp: new Date(),
      payload: {
        answer,
        suggestions,
        reasoning: this.explainReasoning(question, context),
      },
      context: await this.getContext(),
      correlationId: message.id,
    };

    return response;
  }

  /**
   * Review implementation from navigator
   */
  private async reviewImplementation(message: AgentMessage): Promise<AgentMessage> {
    const { code, scenario } = message.payload;

    const review = await this.performArchitectureReview(code, scenario);

    const response: AgentMessage = {
      id: randomUUID(),
      from: AgentType.DRIVER,
      to: AgentType.REVIEWER,
      type: MessageType.REVIEW,
      timestamp: new Date(),
      payload: {
        review,
        approved: review.issues.filter(i => i.severity === 'error').length === 0,
        suggestions: review.suggestions,
        architecturalFeedback: review.architecturalFeedback,
      },
      context: await this.getContext(),
      correlationId: message.id,
    };

    return response;
  }

  /**
   * Update context from incoming message
   */
  private async handleContextUpdate(message: AgentMessage): Promise<AgentMessage> {
    await this.updateContext(message.context);

    // Acknowledge the update
    return {
      id: randomUUID(),
      from: AgentType.DRIVER,
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
   * Analyze scenario and propose architecture
   */
  private async analyzeAndProposeArchitecture(scenario: GherkinScenario, feature: GherkinFeature) {
    // Extract entities and actions from scenario
    const entities = this.extractEntities(scenario);
    const actions = this.extractActions(scenario);

    // Determine components needed
    const components = this.identifyComponents(entities, actions);

    // Define relationships
    const relationships = this.defineRelationships(components);

    return {
      components,
      relationships,
      dataFlow: this.establishDataFlow(components, relationships),
    };
  }

  /**
   * Extract entities from scenario steps
   */
  private extractEntities(scenario: GherkinScenario): string[] {
    const entities: string[] = [];

    for (const step of scenario.steps) {
      // Simple entity extraction - in real implementation, use NLP
      const matches = step.text.match(/\b(user|system|service|database|api|component|module)\b/gi);
      if (matches) {
        entities.push(...matches.map(m => m.toLowerCase()));
      }
    }

    return [...new Set(entities)];
  }

  /**
   * Extract actions from scenario steps
   */
  private extractActions(scenario: GherkinScenario): string[] {
    const actions: string[] = [];

    for (const step of scenario.steps) {
      // Extract action verbs
      const matches = step.text.match(/\b(create|read|update|delete|submit|validate|generate|process|send|receive)\b/gi);
      if (matches) {
        actions.push(...matches.map(m => m.toLowerCase()));
      }
    }

    return [...new Set(actions)];
  }

  /**
   * Identify required components based on entities and actions
   */
  private identifyComponents(entities: string[], actions: string[]) {
    const components: any[] = [];

    // Always add controller if there are user interactions
    if (entities.includes('user') || actions.some(a => ['submit', 'send'].includes(a))) {
      components.push({
        type: 'controller',
        responsibility: 'Handle user requests and responses',
        patterns: ['API Endpoint', 'Request Validation'],
      });
    }

    // Add service layer for business logic
    if (actions.some(a => ['validate', 'process', 'generate'].includes(a))) {
      components.push({
        type: 'service',
        responsibility: 'Implement business logic',
        patterns: ['Business Rules', 'Validation'],
      });
    }

    // Add repository if data persistence is needed
    if (entities.includes('database') || actions.some(a => ['create', 'read', 'update', 'delete'].includes(a))) {
      components.push({
        type: 'repository',
        responsibility: 'Data persistence and retrieval',
        patterns: ['Repository Pattern', 'Data Access Object'],
      });
    }

    // Add API client for external services
    if (entities.includes('api') || actions.some(a => ['send', 'receive'].includes(a))) {
      components.push({
        type: 'client',
        responsibility: 'External API communication',
        patterns: ['API Client', 'Circuit Breaker'],
      });
    }

    return components;
  }

  /**
   * Define relationships between components
   */
  private defineRelationships(components: any[]) {
    const relationships: any[] = [];

    // Controller -> Service
    if (components.some(c => c.type === 'controller') && components.some(c => c.type === 'service')) {
      relationships.push({
        from: 'controller',
        to: 'service',
        type: 'dependency',
        description: 'Controller delegates to service for business logic',
      });
    }

    // Service -> Repository
    if (components.some(c => c.type === 'service') && components.some(c => c.type === 'repository')) {
      relationships.push({
        from: 'service',
        to: 'repository',
        type: 'dependency',
        description: 'Service uses repository for data operations',
      });
    }

    // Service -> Client
    if (components.some(c => c.type === 'service') && components.some(c => c.type === 'client')) {
      relationships.push({
        from: 'service',
        to: 'client',
        type: 'dependency',
        description: 'Service uses client for external API calls',
      });
    }

    return relationships;
  }

  /**
   * Establish data flow
   */
  private establishDataFlow(components: any[], relationships: any[]) {
    // Build a simple data flow based on relationships
    return {
      requestFlow: ['controller', 'service', 'repository'].filter(type =>
        components.some(c => c.type === type)
      ),
      responseFlow: ['repository', 'service', 'controller'].filter(type =>
        components.some(c => c.type === type)
      ).reverse(),
    };
  }

  /**
   * Recommend design patterns for the scenario
   */
  private recommendPatterns(scenario: GherkinScenario): string[] {
    const patterns: string[] = [];

    // Always recommend SOLID principles
    patterns.push('SOLID Principles', 'Dependency Injection');

    // Analyze scenario for specific patterns
    const text = scenario.steps.map(s => s.text).join(' ').toLowerCase();

    if (text.includes('error') || text.includes('exception')) {
      patterns.push('Error Handling Pattern', 'Result Pattern');
    }

    if (text.includes('log') || text.includes('audit')) {
      patterns.push('Decorator Pattern (for logging)', 'Observer Pattern');
    }

    if (text.includes('cache') || text.includes('performance')) {
      patterns.push('Cache-Aside Pattern', 'CQRS');
    }

    return patterns;
  }

  /**
   * Identify constraints and considerations
   */
  private identifyConstraints(scenario: GherkinScenario): string[] {
    const constraints: string[] = [];

    // Always include security constraints
    constraints.push('Authentication and Authorization');
    constraints.push('Input Validation');

    // Extract from scenario
    const text = scenario.steps.map(s => s.text).join(' ').toLowerCase();

    if (text.includes('jwt') || text.includes('token')) {
      constraints.push('JWT Token Management');
    }

    if (text.includes('password') || text.includes('credential')) {
      constraints.push('Secure Password Handling', 'Rate Limiting');
    }

    if (text.includes('database') || text.includes('persistence')) {
      constraints.push('Database Transaction Management');
    }

    return constraints;
  }

  /**
   * Answer architecture-specific questions
   */
  private async answerArchitectureQuestion(question: string, context: any): Promise<string> {
    // Generate contextual response based on the question and current context
    return `Based on the current architecture and requirements, I recommend considering scalability and maintainability. The system should be designed with clear separation of concerns, following domain-driven design principles where applicable.`;
  }

  /**
   * Answer pattern-related questions
   */
  private async answerPatternQuestion(question: string, context: any): Promise<string> {
    return `The appropriate design pattern depends on the specific requirements. For this scenario, consider patterns that promote loose coupling and high cohesion, such as the Strategy pattern for varying behaviors or the Factory pattern for object creation.`;
  }

  /**
   * Generate general response
   */
  private async generateGeneralResponse(question: string, context: any): Promise<string> {
    return `I understand your question about "${question}". Let me analyze this in the context of our current architecture and provide guidance based on best practices and the specific requirements of this feature.`;
  }

  /**
   * Explain reasoning behind decisions
   */
  private explainReasoning(question: string, context: any): string {
    return 'My reasoning is based on established architectural principles, scalability requirements, and the specific context of the feature being implemented.';
  }

  /**
   * Perform architectural review of implementation
   */
  private async performArchitectureReview(code: string, scenario: GherkinScenario) {
    // Simulate review process
    return {
      issues: [],
      suggestions: [
        'Consider extracting business logic into a service layer',
        'Ensure error handling is consistent across components',
      ],
      architecturalFeedback: {
        adherence: 'good',
        violations: [],
        recommendations: [
          'Consider implementing a repository pattern for data access',
          'Add proper error boundaries for better resilience',
        ],
      },
    };
  }
}