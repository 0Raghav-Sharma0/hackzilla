import { z } from "zod";
import { createApiHandler } from "@/lib/api/handler";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";

const emptyQuery = z.object({});

/**
 * Example authenticated read — WHY: Demonstrates `createApiHandler` + Prisma + Clerk user bridge.
 */
export const GET = createApiHandler({
  requireAuth: true,
  querySchema: emptyQuery,
  handler: async (ctx) => {
    const clerkUserId = ctx.clerkUserId;
    if (!clerkUserId) throw AppError.unauthorized();

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      include: { profile: true, tutorProfile: true, wallet: true },
    });

    if (!user || user.deletedAt) {
      throw AppError.notFound("User not provisioned — complete Clerk webhook sync");
    }

    return {
      userId: user.id,
      role: user.role,
      profile: user.profile,
      tutorProfile: user.tutorProfile,
      walletBalanceMicrocredits: user.wallet?.balanceMicrocredits.toString() ?? "0",
    };
  },
});
