import { z } from 'zod';

/**
 * Project configuration schema
 */
export const ProjectConfigSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  featuresDirectory: z.string().default('features'),
  stepsDirectory: z.string().default('src/steps'),
  testsDirectory: z.string().default('tests'),
  docsDirectory: z.string().default('docs'),
  defaultFramework: z.enum(['jest', 'vitest', 'playwright', 'cypress']).default('jest'),
  language: z.enum(['typescript', 'javascript', 'python']).default('typescript'),
  aiAdapters: z.array(z.string()).default([]),
  autoGenerate: z.object({
    steps: z.boolean().default(true),
    tests: z.boolean().default(true),
    docs: z.boolean().default(true),
  }),
  git: z.object({
    hooks: z.object({
      preCommit: z.boolean().default(true),
      prePush: z.boolean().default(false),
    }),
  }),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

/**
 * AI adapter configuration
 */
export interface AIAdapterConfig {
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, any>;
  capabilities: string[];
}

/**
 * Template configuration
 */
export interface TemplateConfig {
  name: string;
  description: string;
  language: string;
  framework?: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  files: {
    path: string;
    content: string;
  }[];
}

/**
 * Feature metadata
 */
export interface FeatureMetadata {
  name: string;
  path: string;
  scenarios: number;
  lastModified: Date;
  tags: string[];
  status: 'draft' | 'in-progress' | 'completed';
  assignedTo?: string;
  estimatedHours?: number;
}

/**
 * Project statistics
 */
export interface ProjectStats {
  features: {
    total: number;
    completed: number;
    inProgress: number;
    draft: number;
  };
  scenarios: {
    total: number;
    withSteps: number;
    tested: number;
  };
  coverage: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}