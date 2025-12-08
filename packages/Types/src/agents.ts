import { z } from 'zod';

/**
 * AI Agent types
 */
export enum AgentType {
  DRIVER = 'driver',
  NAVIGATOR = 'navigator',
  REVIEWER = 'reviewer',
  ANALYZER = 'analyzer',
}

/**
 * Message types between agents
 */
export enum MessageType {
  PROPOSAL = 'proposal',
  IMPLEMENTATION = 'implementation',
  REVIEW = 'review',
  QUESTION = 'question',
  ANSWER = 'answer',
  CONTEXT_UPDATE = 'context_update',
  ERROR = 'error',
}

/**
 * Base message structure for agent communication
 */
export const AgentMessageSchema = z.object({
  id: z.string(),
  from: z.nativeEnum(AgentType),
  to: z.union([
    z.nativeEnum(AgentType),
    z.literal('human'),
  ]),
  type: z.nativeEnum(MessageType),
  timestamp: z.date(),
  payload: z.any(),
  context: z.record(z.any()),
  correlationId: z.string().optional(),
});

export type AgentMessage = z.infer<typeof AgentMessageSchema>;

/**
 * Agent capabilities and metadata
 */
export interface AgentCapabilities {
  canAnalyzeCode: boolean;
  canWriteCode: boolean;
  canRunTests: boolean;
  canReviewCode: boolean;
  supportedLanguages: string[];
  maxTokens?: number;
}

/**
 * AI Agent interface
 */
export interface AIAgent {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  capabilities: AgentCapabilities;
  initialize(config: Record<string, any>): Promise<void>;
  processMessage(message: AgentMessage): Promise<AgentMessage | null>;
  getContext(): Promise<Record<string, any>>;
  updateContext(context: Record<string, any>): Promise<void>;
}

/**
 * Driver Agent configuration
 */
export interface DriverAgentConfig {
  preferences?: {
    architectureStyle: string[];
    designPatterns: string[];
    testingFrameworks: string[];
  };
  constraints?: {
    maxFileSize?: number;
    forbiddenPatterns?: string[];
    requiredStandards?: string[];
  };
}

/**
 * Navigator Agent configuration
 */
export interface NavigatorAgentConfig {
  specialties?: string[];
  preferences?: {
    codeStyle: string;
    commentStyle: string;
    errorHandling: string;
  };
  tools?: {
    debugger: boolean;
    linter: boolean;
    formatter: boolean;
  };
}

/**
 * Reviewer Agent configuration
 */
export interface ReviewerAgentConfig {
  reviewFocus?: {
    correctness: boolean;
    performance: boolean;
    security: boolean;
    maintainability: boolean;
  };
  severity?: {
    blockers: boolean;
    critical: boolean;
    major: boolean;
    minor: boolean;
  };
}

/**
 * Analyzer Agent configuration
 */
export interface AnalyzerAgentConfig {
  patterns?: string[];
  bestPractices?: string[];
  preferences?: {
    scenarioDetailLevel: 'basic' | 'standard' | 'detailed';
    includeEdgeCases: boolean;
    includeErrorCases: boolean;
    includeIntegrationScenarios: boolean;
  };
  domain?: string;
  validationRules?: Record<string, boolean>;
}

/**
 * Pair programming session
 */
export interface PairSession {
  id: string;
  scenario: string;
  driver: string; // Agent ID
  navigator: string; // Agent ID
  reviewer?: string; // Agent ID
  messages: AgentMessage[];
  context: Record<string, any>;
  status: 'active' | 'paused' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Agent response format
 */
export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  suggestions?: string[];
  nextSteps?: string[];
}