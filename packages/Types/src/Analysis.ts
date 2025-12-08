import { z } from 'zod';
import { ParsedPRDSchema } from './PRD.js';
import { ExtractedFeatureSchema } from './Features.js';
import { GeneratedScenarioSchema } from './Scenarios.js';
import { GherkinFeatureSchema } from './gherkin.js';

/**
 * Validation result for requirements
 */
export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
  score: z.number(),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

/**
 * Analysis result containing all extracted information
 */
export const AnalysisResultSchema = z.object({
  prd: ParsedPRDSchema,
  features: z.array(ExtractedFeatureSchema),
  scenarios: z.map(z.string(), z.array(GeneratedScenarioSchema)),
  gherkinFeatures: z.map(z.string(), GherkinFeatureSchema),
  summary: z.object({
    totalFeatures: z.number(),
    totalScenarios: z.number(),
    byComplexity: z.record(z.number()),
    byPriority: z.record(z.number()),
  }),
  recommendations: z.array(z.string()),
  validation: ValidationResultSchema,
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;