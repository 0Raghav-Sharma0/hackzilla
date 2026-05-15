"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getAppUserOrThrow } from "@/lib/auth/app-user";

const reportSchema = z.object({
  targetType: z.enum(["HELP_REQUEST", "USER", "SESSION"]),
  targetId: z.string().min(1),
  reason: z.string().min(3).max(4000),
});

const institutionEmailSchema = z.object({
  email: z.string().email().max(320),
});

/** Community reporting — single write, no follow-up queries in the hot path. */
export async function submitContentReport(raw: unknown) {
  const user = await getAppUserOrThrow();
  const input = reportSchema.parse(raw);

  await prisma.contentReport.create({
    data: {
      reporterId: user.id,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
    },
  });

  return { ok: true as const };
}

/** Store institution email for async verification (demo: pattern check only). */
export async function submitInstitutionVerificationEmail(raw: unknown) {
  const user = await getAppUserOrThrow();
  const { email } = institutionEmailSchema.parse(raw);
  const lower = email.toLowerCase();
  if (!lower.endsWith(".edu") && !lower.includes(".ac.")) {
    throw new Error("Use your school-issued email (e.g. .edu or .ac.xx).");
  }

  await prisma.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      displayName: user.profile?.displayName ?? "Learner",
      institutionVerificationEmail: lower,
    },
    update: {
      institutionVerificationEmail: lower,
      institutionVerifiedAt: null,
    },
  });

  return { ok: true as const };
}
