import { z } from 'zod';

/**
 * Test framework types
 */
export enum TestFramework {
  JEST = 'jest',
  VITEST = 'vitest',
  PLAYWRIGHT = 'playwright',
  CYPRESS = 'cypress',
  CUCUMBER_JS = 'cucumber-js',
}

/**
 * Test types
 */
export enum TestType {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  E2E = 'e2e',
  ACCEPTANCE = 'acceptance',
  VISUAL_REGRESSION = 'visual_regression',
  PERFORMANCE = 'performance',
}

/**
 * Generated test file
 */
export const TestFileSchema = z.object({
  name: z.string(),
  path: z.string(),
  framework: z.nativeEnum(TestFramework),
  type: z.nativeEnum(TestType),
  content: z.string(),
  dependencies: z.array(z.string()),
  coverage: z.number().optional(),
});

export type TestFile = z.infer<typeof TestFileSchema>;

/**
 * Test execution result
 */
export const TestResultSchema = z.object({
  file: z.string(),
  framework: z.nativeEnum(TestFramework),
  type: z.nativeEnum(TestType),
  passed: z.boolean(),
  duration: z.number(),
  assertions: z.number(),
  failures: z.array(z.object({
    scenario: z.string(),
    error: z.string(),
    stack?: z.string(),
  })),
  coverage: z.object({
    lines: z.number(),
    functions: z.number(),
    branches: z.number(),
    statements: z.number(),
  }).optional(),
});

export type TestResult = z.infer<typeof TestResultSchema>;

/**
 * Step definition template
 */
export interface StepDefinitionTemplate {
  pattern: RegExp;
  parameters: string[];
  implementation: string;
  imports: string[];
  helpers: string[];
}

/**
 * Test generation configuration
 */
export interface TestGenerationConfig {
  framework: TestFramework;
  outputDirectory: string;
  testType: TestType;
  includeMocks: boolean;
  includeAssertions: boolean;
  customTemplates?: Record<string, string>;
}

/**
 * Coverage report
 */
export interface CoverageReport {
  total: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  files: Record<string, {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  }>;
  summary: {
    pass: boolean;
    threshold: number;
  };
}

/**
 * Test execution options
 */
export interface TestExecutionOptions {
  framework: TestFramework;
  files?: string[];
  pattern?: string;
  watch?: boolean;
  coverage?: boolean;
  parallel?: boolean;
  reporter?: string;
  timeout?: number;
}