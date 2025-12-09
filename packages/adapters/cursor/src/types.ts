/**
 * Configuration for Cursor adapter
 */
export interface CursorAdapterConfig {
  /** Project root directory */
  projectRoot: string;
  /** Cursor rules file path (default: .cursorrules) */
  rulesFile?: string;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Cursor rule definition
 */
export interface CursorRule {
  /** Rule name */
  name: string;
  /** Rule description */
  description: string;
  /** Rule content/instructions */
  content: string;
}

/**
 * Result of adapter initialization
 */
export interface AdapterInitResult {
  success: boolean;
  filesCreated: string[];
  errors?: string[];
}

/**
 * Agent execution context for Cursor
 */
export interface CursorExecutionContext {
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
