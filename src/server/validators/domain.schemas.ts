import { z } from "zod";

export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export const subjectSlugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/, "subjectSlug must be kebab-case");

export const createHelpRequestBodySchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(10).max(8000),
  subjectSlug: subjectSlugSchema,
  topicSlug: z.string().max(64).optional(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH"]),
  preferredDurationMinutes: z.number().int().min(5).max(180),
  language: z.string().min(2).max(16),
});

export const updateHelpRequestBodySchema = createHelpRequestBodySchema.partial();

export const acceptHelpRequestBodySchema = z.object({
  tutorUserId: z.string().cuid(),
  idempotencyKey: z.string().uuid(),
});

export const transferCreditsBodySchema = z.object({
  toUserId: z.string().cuid(),
  amountMicrocredits: z.string().regex(/^\d+$/),
  idempotencyKey: z.string().uuid(),
  reason: z.enum(["SESSION_PAYMENT", "TIP", "ADMIN_ADJUSTMENT"]),
});

export const sendMessageBodySchema = z.object({
  sessionId: z.string().cuid(),
  clientMessageId: z.string().uuid(),
  body: z.string().min(1).max(8000),
});

export const roadmapGenerateBodySchema = z.object({
  goal: z.string().min(10).max(2000),
  subjectSlug: subjectSlugSchema.optional(),
  horizonWeeks: z.number().int().min(1).max(24).optional().default(4),
});
