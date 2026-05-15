import { z } from "zod";

export const subjectSlugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/, "Use kebab-case, e.g. linear-algebra");

export const createHelpRequestSchema = z.object({
  title: z.string().min(4).max(200),
  body: z.string().min(12).max(8000),
  subjectSlug: subjectSlugSchema,
  topicSlug: z.string().max(80).optional(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH"]),
  preferredDurationMinutes: z.coerce.number().int().min(10).max(180),
  language: z.string().min(2).max(16),
});

export type CreateHelpRequestInput = z.infer<typeof createHelpRequestSchema>;
