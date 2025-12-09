import {
  AIAgent,
  AgentMessage,
  MessageType,
  GherkinScenario,
  GherkinFeature,
} from '@bddai/types';
import { DriverAgent } from './DriverAgent.js';
import { NavigatorAgent } from './NavigatorAgent.js';
import { ReviewerAgent } from './ReviewerAgent.js';
import { AnalyzerAgent } from './AnalyzerAgent.js';
import { PairSession } from './PairSession.js';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

/**
 * Orchestrates AI agents and manages pair programming sessions
 */
export class AgentOrchestrator extends EventEmitter {
  private sessions: Map<string, PairSession> = new Map();
  private agents: Map<string, AIAgent> = new Map();
  private activeDrivers: Map<string, DriverAgent> = new Map();
  private activeNavigators: Map<string, NavigatorAgent> = new Map();
  private activeReviewers: Map<string, ReviewerAgent> = new Map();
  private activeAnalyzers: Map<string, any> = new Map();

  /**
   * Initialize the orchestrator with default agents
   */
  async initialize(): Promise<void> {
    // Create default agents
    const defaultDriver = new DriverAgent();
    const defaultNavigator = new NavigatorAgent();
    const defaultReviewer = new ReviewerAgent();
    const defaultAnalyzer = new AnalyzerAgent();

    // Register agents
    this.registerAgent(defaultDriver);
    this.registerAgent(defaultNavigator);
    this.registerAgent(defaultReviewer);
    this.registerAgent(defaultAnalyzer);

    // Store active instances
    this.activeDrivers.set('default', defaultDriver);
    this.activeNavigators.set('default', defaultNavigator);
    this.activeReviewers.set('default', defaultReviewer);
    this.activeAnalyzers.set('default', defaultAnalyzer);

    this.emit('orchestratorInitialized');
  }

  /**
   * Register a new agent
   */
  registerAgent(agent: AIAgent): void {
    this.agents.set(agent.id, agent);
    this.emit('agentRegistered', { agentId: agent.id, type: agent.type });
  }

  /**
   * Create a new pair programming session
   */
  async createSession(
    scenarioName: string,
    driverId?: string,
    navigatorId?: string,
    reviewerId?: string
  ): Promise<PairSession> {
    // Get or create agents
    const driver = driverId ? (this.agents.get(driverId) as DriverAgent) : this.activeDrivers.get('default');
    const navigator = navigatorId ? (this.agents.get(navigatorId) as NavigatorAgent) : this.activeNavigators.get('default');
    const reviewer = reviewerId ? (this.agents.get(reviewerId) as ReviewerAgent) : this.activeReviewers.get('default');

    if (!driver || !navigator) {
      throw new Error('Failed to create session: missing required agents');
    }

    // Create session
    const session = new PairSession(scenarioName, driver, navigator, reviewer);

    // Set up session event handlers
    this.setupSessionHandlers(session);

    // Store session
    this.sessions.set(session.id, session);

    this.emit('sessionCreated', { sessionId: session.id, scenario: scenarioName });

    return session;
  }

  /**
   * Start a pair programming session for a scenario
   */
  async startSession(
    sessionId: string,
    feature: GherkinFeature,
    scenario: GherkinScenario
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    await session.start(feature, scenario);
    this.emit('sessionStarted', { sessionId, scenario: scenario.name });
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): PairSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): PairSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * End a session
   */
  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    await session.end();
    this.sessions.delete(sessionId);
    this.emit('sessionEnded', { sessionId });
  }

  /**
   * Send a human message to a session
   */
  async sendHumanMessage(
    sessionId: string,
    message: string,
    targetAgent?: string
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const agentMessage: AgentMessage = {
      id: randomUUID(),
      from: 'human' as any,
      to: (targetAgent as any) || 'driver' as any,
      type: MessageType.QUESTION,
      timestamp: new Date(),
      payload: {
        question: message,
        context: session.context,
      },
      context: session.context,
    };

    await session.sendMessage(agentMessage);
  }

  /**
   * Switch roles in a session
   */
  async switchRoles(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    await session.switchRoles();
    this.emit('rolesSwitched', { sessionId });
  }

  /**
   * Pause a session
   */
  pauseSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.pause();
    this.emit('sessionPaused', { sessionId });
  }

  /**
   * Resume a session
   */
  resumeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.resume();
    this.emit('sessionResumed', { sessionId });
  }

  /**
   * Get statistics for all sessions
   */
  getStatistics() {
    const sessions = Array.from(this.sessions.values());
    const totalMessages = sessions.reduce((total, session) => total + session.messages.length, 0);
    const activeSessions = sessions.filter(s => s.status === 'active').length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;

    return {
      agents: {
        total: this.agents.size,
        drivers: this.activeDrivers.size,
        navigators: this.activeNavigators.size,
        reviewers: this.activeReviewers.size,
        analyzers: this.activeAnalyzers.size,
      },
      sessions: {
        total: sessions.length,
        active: activeSessions,
        completed: completedSessions,
        paused: sessions.filter(s => s.status === 'paused').length,
      },
      messages: {
        total: totalMessages,
        averagePerSession: sessions.length > 0 ? totalMessages / sessions.length : 0,
      },
    };
  }

  /**
   * Create specialized agents for a specific domain
   */
  async createDomainAgents(domain: string, config: any): Promise<{
    driver: DriverAgent;
    navigator: NavigatorAgent;
    reviewer: ReviewerAgent;
  }> {
    // Create domain-specific driver
    const driver = new DriverAgent({
      preferences: {
        architectureStyle: config.architectureStyle || ['microservices'],
        designPatterns: config.designPatterns || [],
        testingFrameworks: config.testingFrameworks || [],
      },
      constraints: config.constraints || {},
    });

    // Create domain-specific navigator
    const navigator = new NavigatorAgent({
      specialties: config.specialties || [],
      preferences: {
        codeStyle: config.codeStyle || 'standard',
        commentStyle: config.commentStyle || 'jsdoc',
        errorHandling: config.errorHandling || 'throw',
      },
      tools: config.tools || {
        debugger: true,
        linter: true,
        formatter: true,
      },
    });

    // Create domain-specific reviewer
    const reviewer = new ReviewerAgent({
      reviewFocus: {
        correctness: config.reviewCorrectness !== false,
        performance: config.reviewPerformance !== false,
        security: config.reviewSecurity !== false,
        maintainability: config.reviewMaintainability !== false,
      },
      severity: {
        blockers: config.severityBlockers !== false,
        critical: config.severityCritical !== false,
        major: config.severityMajor !== false,
        minor: config.severityMinor !== false,
      },
    });

    // Create domain-specific analyzer
    const analyzer = new AnalyzerAgent({
      preferences: {
        scenarioDetailLevel: config.scenarioDetailLevel || 'standard',
        includeEdgeCases: config.includeEdgeCases !== false,
        includeErrorCases: config.includeErrorCases !== false,
        includeIntegrationScenarios: config.includeIntegrationScenarios !== false,
      },
      domain: config.domain,
      validationRules: config.validationRules || {},
    });

    // Initialize agents
    await Promise.all([
      driver.initialize({ domain }),
      navigator.initialize({ domain }),
      reviewer.initialize({ domain }),
      analyzer.initialize({ domain }),
    ]);

    // Register agents
    this.registerAgent(driver);
    this.registerAgent(navigator);
    this.registerAgent(reviewer);
    this.registerAgent(analyzer);

    // Store domain-specific instances
    this.activeDrivers.set(domain, driver);
    this.activeNavigators.set(domain, navigator);
    this.activeReviewers.set(domain, reviewer);
    this.activeAnalyzers.set(domain, analyzer);

    return { driver, navigator, reviewer };
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    // End all active sessions
    const sessionPromises = Array.from(this.sessions.entries()).map(([id, session]) =>
      this.endSession(id).catch(console.error)
    );
    await Promise.all(sessionPromises);

    // Clear all maps
    this.sessions.clear();
    this.agents.clear();
    this.activeDrivers.clear();
    this.activeNavigators.clear();
    this.activeReviewers.clear();
    this.activeAnalyzers.clear();

    this.emit('orchestratorDisposed');
  }

  /**
   * Set up event handlers for a session
   */
  private setupSessionHandlers(session: PairSession): void {
    // Forward session events
    session.on('message', (data) => {
      this.emit('sessionMessage', data);
    });

    session.on('humanMessage', (data) => {
      this.emit('humanMessage', data);
    });

    session.on('rolesSwitched', (data) => {
      this.emit('sessionRolesSwitched', data);
    });

    session.on('sessionEnded', (data) => {
      this.emit('sessionCompleted', data);
    });

    session.on('error', (data) => {
      this.emit('sessionError', data);
    });
  }
}