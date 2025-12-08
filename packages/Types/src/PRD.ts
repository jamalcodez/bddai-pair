import { z } from 'zod';

/**
 * Parsed requirement structure
 */
export const ParsedRequirementSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['user-story', 'feature', 'requirement', 'acceptance-criteria']),
  priority: z.enum(['high', 'medium', 'low']),
  actor: z.string().optional(),
  goal: z.string().optional(),
  value: z.string().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export type ParsedRequirement = z.infer<typeof ParsedRequirementSchema>;

/**
 * Parsed PRD structure
 */
export const ParsedPRDSchema = z.object({
  title: z.string(),
  description: z.string(),
  version: z.string(),
  author: z.string().optional(),
  stakeholders: z.array(z.string()).optional(),
  requirements: z.array(ParsedRequirementSchema),
  metadata: z.object({
    totalRequirements: z.number(),
    byType: z.record(z.number()),
    byPriority: z.record(z.number()),
  }),
});

export type ParsedPRD = z.infer<typeof ParsedPRDSchema>;