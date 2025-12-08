import { z } from 'zod';

/**
 * Represents a Gherkin step (Given, When, Then, And, But)
 */
export const GherkinStepSchema = z.object({
  keyword: z.string(),
  text: z.string(),
  line: z.number(),
  column: z.number().optional(),
  argument: z.union([
    z.object({
      type: z.literal('DocString'),
      content: z.string(),
      contentType: z.string().optional(),
    }),
    z.object({
      type: z.literal('DataTable'),
      rows: z.array(z.array(z.string())),
    }),
  ]).optional(),
});

export type GherkinStep = z.infer<typeof GherkinStepSchema>;

/**
 * Represents a Gherkin scenario
 */
export const GherkinScenarioSchema = z.object({
  name: z.string(),
  keyword: z.string(),
  description: z.string().optional(),
  line: z.number(),
  tags: z.array(z.object({
    name: z.string(),
    line: z.number(),
  })).optional(),
  steps: z.array(GherkinStepSchema),
});

export type GherkinScenario = z.infer<typeof GherkinScenarioSchema>;

/**
 * Represents a Gherkin scenario outline
 */
export const GherkinScenarioOutlineSchema = z.object({
  name: z.string(),
  keyword: z.string(),
  description: z.string().optional(),
  line: z.number(),
  tags: z.array(z.object({
    name: z.string(),
    line: z.number(),
  })).optional(),
  steps: z.array(GherkinStepSchema),
  examples: z.array(z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    line: z.number(),
    tableHeader: z.array(z.string()),
    tableBody: z.array(z.array(z.string())),
  })),
});

export type GherkinScenarioOutline = z.infer<typeof GherkinScenarioOutlineSchema>;

/**
 * Represents a Gherkin background section
 */
export const GherkinBackgroundSchema = z.object({
  name: z.string().optional(),
  keyword: z.string(),
  description: z.string().optional(),
  line: z.number(),
  steps: z.array(GherkinStepSchema),
});

export type GherkinBackground = z.infer<typeof GherkinBackgroundSchema>;

/**
 * Represents a complete Gherkin feature
 */
export const GherkinFeatureSchema = z.object({
  uri: z.string(),
  name: z.string(),
  keyword: z.string(),
  description: z.string().optional(),
  line: z.number(),
  tags: z.array(z.object({
    name: z.string(),
    line: z.number(),
  })).optional(),
  background: z.optional(GherkinBackgroundSchema),
  scenarios: z.array(GherkinScenarioSchema),
  scenarioOutlines: z.array(GherkinScenarioOutlineSchema),
  comments: z.array(z.object({
    text: z.string(),
    line: z.number(),
  })).optional(),
});

export type GherkinFeature = z.infer<typeof GherkinFeatureSchema>;

/**
 * Represents parsed Gherkin document
 */
export const GherkinDocumentSchema = z.object({
  feature: z.optional(GherkinFeatureSchema),
  uri: z.string(),
});

export type GherkinDocument = z.infer<typeof GherkinDocumentSchema>;

/**
 * Step pattern for matching steps to implementations
 */
export interface StepPattern {
  pattern: RegExp;
  implementation: string;
  type: 'given' | 'when' | 'then' | 'and' | 'but';
  examples?: Array<{
    description: string;
    parameters: Record<string, any>;
  }>;
}

/**
 * Parsed step with matched pattern
 */
export interface ParsedStep extends GherkinStep {
  matchedPattern?: StepPattern;
  parameters?: string[];
}

/**
 * Scenario execution context
 */
export interface ExecutionContext {
  scenario: GherkinScenario;
  feature: GherkinFeature;
  variables: Record<string, any>;
  steps: ParsedStep[];
}