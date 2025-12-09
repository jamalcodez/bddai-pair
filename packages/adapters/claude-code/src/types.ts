/**
 * Configuration for Claude Code adapter
 */
export interface ClaudeCodeAdapterConfig {
  /** Project root directory */
  projectRoot: string;
  /** Claude commands directory (default: .claude/commands) */
  commandsDir?: string;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Claude Code command definition
 */
export interface ClaudeCommand {
  /** Command name (without slash) */
  name: string;
  /** Command description */
  description: string;
  /** Command prompt content */
  content: string;
}

/**
 * Result of adapter initialization
 */
export interface AdapterInitResult {
  success: boolean;
  commandsCreated: string[];
  errors?: string[];
}

/**
 * Agent execution context for Claude Code
 */
export interface ClaudeExecutionContext {
  feature?: string;
  scenario?: string;
  workingDirectory: string;
  messages: Array<{
    id: string;
    content: string;
    role: 'user' | 'assistant' | 'system';
    timestamp: Date;
  }>;
}
