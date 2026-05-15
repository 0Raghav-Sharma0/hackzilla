import { prisma } from "@/lib/db/prisma";
import { ensureLearnloopDemoWalletTopUp } from "@/lib/demo/demo-wallet-topup";

export type SyncClerkUserInput = {
  id: string;
  primaryEmail: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
};

/** Upsert internal `User` + profile + wallet from Clerk identity — shared by webhooks and JIT sign-in. */
export async function upsertUserFromClerkSync(input: SyncClerkUserInput) {
  const displayName =
    [input.firstName, input.lastName].filter(Boolean).join(" ") ||
    input.primaryEmail ||
    "Learner";

  await prisma.user.upsert({
    where: { clerkUserId: input.id },
    create: {
      clerkUserId: input.id,
      email: input.primaryEmail,
      profile: {
        create: {
          displayName,
          avatarUrl: input.imageUrl ?? undefined,
        },
      },
      wallet: { create: {} },
    },
    update: {
      email: input.primaryEmail ?? undefined,
      deletedAt: null,
      profile: {
        upsert: {
          create: {
            displayName,
            avatarUrl: input.imageUrl ?? undefined,
          },
          update: {
            displayName,
            avatarUrl: input.imageUrl ?? undefined,
          },
        },
      },
    },
  });

  const row = await prisma.user.findUnique({
    where: { clerkUserId: input.id },
    select: { id: true },
  });
  if (row) await ensureLearnloopDemoWalletTopUp(row.id);
}
