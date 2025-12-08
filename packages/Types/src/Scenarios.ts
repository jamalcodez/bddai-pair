import { z } from 'zod';
import { GherkinStepSchema } from './gherkin.js';

/**
 * Generated Gherkin scenario with metadata
 */
export const GeneratedScenarioSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()),
  steps: z.array(GherkinStepSchema),
  type: z.enum(['happy-path', 'error-case', 'edge-case', 'integration']),
  source: z.enum(['user-story', 'acceptance-criteria', 'generated']),
  confidence: z.number(),
});

export type GeneratedScenario = z.infer<typeof GeneratedScenarioSchema>;

/**
 * Scenario generation options
 */
export const ScenarioGenerationOptionsSchema = z.object({
  includeEdgeCases: z.boolean(),
  includeErrorCases: z.boolean(),
  includeIntegrationScenarios: z.boolean(),
  maxScenariosPerFlow: z.number(),
  detailLevel: z.enum(['basic', 'standard', 'detailed']),
});

export type ScenarioGenerationOptions = z.infer<typeof ScenarioGenerationOptionsSchema>;