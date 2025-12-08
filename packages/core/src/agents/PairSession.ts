import {
  AIAgent,
  AgentMessage,
  MessageType,
  PairSession as IPairSession,
  GherkinScenario,
  GherkinFeature,
} from '@bddai/types';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

/**
 * Manages a pair programming session between AI agents
 */
export class PairSession extends EventEmitter implements IPairSession {
  id: string;
  scenario: string;
  driver: string; // Agent ID
  navigator: string; // Agent ID
  reviewer?: string; // Agent ID
  messages: AgentMessage[] = [];
  context: Record<string, any> = {};
  status: 'active' | 'paused' | 'completed' | 'failed' = 'active';
  createdAt: Date;
  updatedAt: Date;

  // Agent instances
  private agents: Map<string, AIAgent> = new Map();
  private currentDriver?: AIAgent;
  private currentNavigator?: AIAgent;
  private currentReviewer?: AIAgent;

  constructor(
    scenario: string,
    driverAgent: AIAgent,
    navigatorAgent: AIAgent,
    reviewerAgent?: AIAgent
  ) {
    super();
    this.id = randomUUID();
    this.scenario = scenario;
    this.driver = driverAgent.id;
    this.navigator = navigatorAgent.id;
    this.reviewer = reviewerAgent?.id;
    this.createdAt = new Date();
    this.updatedAt = new Date();

    // Store agent instances
    this.agents.set(driverAgent.id, driverAgent);
    this.agents.set(navigatorAgent.id, navigatorAgent);
    if (reviewerAgent) {
      this.agents.set(reviewerAgent.id, reviewerAgent);
    }

    this.currentDriver = driverAgent;
    this.currentNavigator = navigatorAgent;
    this.currentReviewer = reviewerAgent;

    // Initialize shared context
    this.context = {
      sessionId: this.id,
      scenario,
      startTime: this.createdAt,
      turn: 0,
      driverTurns: 0,
      navigatorTurns: 0,
    };
  }

  /**
   * Start the pair programming session
   */
  async start(feature: GherkinFeature, scenario: GherkinScenario): Promise<void> {
    this.status = 'active';
    this.emit('sessionStarted', { sessionId: this.id, scenario: scenario.name });

    // Initialize agents with session context
    await this.initializeAgents();

    // Send initial proposal to driver
    await this.sendMessage({
      id: randomUUID(),
      from: 'human' as any,
      to: this.currentDriver!.id as any,
      type: MessageType.PROPOSAL,
      timestamp: new Date(),
      payload: {
        type: 'scenario_proposal',
        feature,
        scenario,
      },
      context: { ...this.context },
    });
  }

  /**
   * Send a message in the session
   */
  async sendMessage(message: AgentMessage): Promise<void> {
    // Add to message history
    this.messages.push(message);
    this.updatedAt = new Date();

    // Update turn counter
    this.context.turn++;
    if (message.from === this.driver) {
      this.context.driverTurns++;
    } else if (message.from === this.navigator) {
      this.context.navigatorTurns++;
    }

    // Find target agent
    const targetAgent = this.agents.get(message.to);
    if (!targetAgent) {
      throw new Error(`Agent ${message.to} not found in session`);
    }

    // Process message
    try {
      const response = await targetAgent.processMessage(message);

      // If there's a response, route it
      if (response) {
        await this.routeMessage(response);
      }
    } catch (error) {
      console.error(`Error processing message in agent ${message.to}:`, error);
      await this.handleProcessingError(error, message);
    }

    // Emit message event
    this.emit('message', { sessionId: this.id, message });
  }

  /**
   * Switch driver and navigator roles
   */
  async switchRoles(): Promise<void> {
    if (!this.currentDriver || !this.currentNavigator) {
      throw new Error('Cannot switch roles: missing agents');
    }

    // Swap the agents
    const temp = this.currentDriver;
    this.currentDriver = this.currentNavigator;
    this.currentNavigator = temp;

    // Update IDs
    const tempId = this.driver;
    this.driver = this.navigator;
    this.navigator = tempId;

    // Notify agents of role change
    await this.currentDriver.updateContext({
      ...this.context,
      role: 'driver',
      previousRole: 'navigator',
    });

    await this.currentNavigator.updateContext({
      ...this.context,
      role: 'navigator',
      previousRole: 'driver',
    });

    this.emit('rolesSwitched', {
      sessionId: this.id,
      driver: this.driver,
      navigator: this.navigator,
    });
  }

  /**
   * Pause the session
   */
  pause(): void {
    this.status = 'paused';
    this.emit('sessionPaused', { sessionId: this.id });
  }

  /**
   * Resume the session
   */
  resume(): void {
    this.status = 'active';
    this.emit('sessionResumed', { sessionId: this.id });
  }

  /**
   * End the session
   */
  async end(): Promise<void> {
    this.status = 'completed';

    // Generate session summary
    const summary = this.generateSummary();

    // Send summary to reviewer if available
    if (this.currentReviewer) {
      await this.sendMessage({
        id: randomUUID(),
        from: 'system' as any,
        to: this.currentReviewer.id as any,
        type: MessageType.REVIEW,
        timestamp: new Date(),
        payload: {
          type: 'session_summary',
          summary,
        },
        context: { ...this.context },
      });
    }

    this.emit('sessionEnded', {
      sessionId: this.id,
      summary,
      duration: new Date().getTime() - this.createdAt.getTime(),
    });
  }

  /**
   * Get session statistics
   */
  getStatistics() {
    const messagesByType = this.messages.reduce((acc, msg) => {
      acc[msg.type] = (acc[msg.type] || 0) + 1;
      return acc;
    }, {} as Record<MessageType, number>);

    return {
      sessionId: this.id,
      status: this.status,
      duration: new Date().getTime() - this.createdAt.getTime(),
      messages: {
        total: this.messages.length,
        byType: messagesByType,
      },
      turns: {
        total: this.context.turn,
        driver: this.context.driverTurns,
        navigator: this.context.navigatorTurns,
      },
    };
  }

  /**
   * Route messages between agents
   */
  private async routeMessage(message: AgentMessage): Promise<void> {
    // Update shared context
    if (message.context) {
      this.context = { ...this.context, ...message.context };
    }

    // Route to appropriate target
    const targetAgent = this.agents.get(message.to);
    if (targetAgent) {
      // Process in target agent
      const response = await targetAgent.processMessage(message);
      if (response) {
        await this.routeMessage(response);
      }
    } else if (message.to === 'human') {
      // Send to human
      this.emit('humanMessage', { sessionId: this.id, message });
    }
  }

  /**
   * Initialize all agents with session context
   */
  private async initializeAgents(): Promise<void> {
    const initPromises = Array.from(this.agents.entries()).map(async ([id, agent]) => {
      const role = id === this.driver ? 'driver' : id === this.navigator ? 'navigator' : 'reviewer';
      await agent.initialize({
        ...this.context,
        role,
        agents: {
          driver: this.driver,
          navigator: this.navigator,
          reviewer: this.reviewer,
        },
      });
    });

    await Promise.all(initPromises);
  }

  /**
   * Handle processing errors
   */
  private async handleProcessingError(error: any, originalMessage: AgentMessage): Promise<void> {
    const errorMessage: AgentMessage = {
      id: randomUUID(),
      from: 'system' as any,
      to: 'human' as any,
      type: MessageType.ERROR,
      timestamp: new Date(),
      payload: {
        error: error.message,
        stack: error.stack,
        originalMessage: originalMessage,
      },
      context: { ...this.context },
    };

    this.emit('error', { sessionId: this.id, error: errorMessage });
  }

  /**
   * Generate session summary
   */
  private generateSummary() {
    const stats = this.getStatistics();
    return {
      sessionId: this.id,
      scenario: this.scenario,
      duration: stats.duration,
      messages: stats.messages,
      turns: stats.turns,
      status: this.status,
      achievements: this.identifyAchievements(),
      improvements: this.identifyImprovements(),
    };
  }

  /**
   * Identify achievements in the session
   */
  private identifyAchievements(): string[] {
    const achievements: string[] = [];

    if (this.context.turn > 10) {
      achievements.push('Active collaboration');
    }

    if (this.context.driverTurns > 0 && this.context.navigatorTurns > 0) {
      achievements.push('Balanced participation');
    }

    const errorMessages = this.messages.filter(m => m.type === MessageType.ERROR);
    if (errorMessages.length === 0) {
      achievements.push('Error-free session');
    }

    return achievements;
  }

  /**
   * Identify areas for improvement
   */
  private identifyImprovements(): string[] {
    const improvements: string[] = [];

    const ratio = this.context.driverTurns / (this.context.navigatorTurns || 1);
    if (ratio > 3 || ratio < 0.33) {
      improvements.push('Balance participation between roles');
    }

    if (this.messages.length < 5) {
      improvements.push('Increase communication frequency');
    }

    return improvements;
  }
}