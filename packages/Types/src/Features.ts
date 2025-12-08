import { z } from 'zod';
import { ParsedRequirementSchema } from './PRD.js';

/**
 * User flow within a feature
 */
export const UserFlowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  steps: z.array(z.string()),
  actor: z.string(),
});

export type UserFlow = z.infer<typeof UserFlowSchema>;

/**
 * Extracted feature with related requirements
 */
export const ExtractedFeatureSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  requirements: z.array(ParsedRequirementSchema),
  dependencies: z.array(z.string()),
  priority: z.enum(['high', 'medium', 'low']),
  complexity: z.enum(['simple', 'medium', 'complex']),
  estimatedScenarios: z.number(),
  userFlows: z.array(UserFlowSchema),
});

export type ExtractedFeature = z.infer<typeof ExtractedFeatureSchema>;