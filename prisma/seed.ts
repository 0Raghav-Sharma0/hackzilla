import { PrismaClient } from "@prisma/client";
import { seedDemoEcosystem } from "./demo-ecosystem";
import { grantWalletCreditOnce } from "../src/lib/demo/demo-wallet-topup";

/**
 * Default seed: Loop Bot + achievements only (fast, few DB rows).
 * Heavy demo users/requests: `DEMO_ECOSYSTEM_SEED=1 npm run db:seed` or `npm run db:seed:demo`.
 */
const prisma = new PrismaClient();

/** Synthetic tutor for solo demos — no real Clerk user; used only for interest + match rows. */
const DEMO_BOT_CLERK_ID = "demo_bot_clerk_learnloop";

async function main() {
  await prisma.user.upsert({
    where: { clerkUserId: DEMO_BOT_CLERK_ID },
    create: {
      clerkUserId: DEMO_BOT_CLERK_ID,
      email: "loop-bot@learnloop.local",
      profile: {
        create: {
          displayName: "Loop Bot",
          bio: "Synthetic tutor for hackathon / demo flows.",
          campusSlug: "demo-campus",
        },
      },
      wallet: { create: {} },
      tutorProfile: {
        create: {
          headline: "Instant demo tutor — always online",
          teachingSubjectSlugs: ["calculus", "linear-algebra", "physics", "cs-fundamentals"],
          completedSessionCount: 420,
          averageRating: 4.92,
          totalRatingsCount: 128,
          isAcceptingRequests: true,
          verificationStatus: "VERIFIED",
        },
      },
      presence: {
        create: {
          status: "ONLINE",
          lastSeenAt: new Date(),
        },
      },
    },
    update: {
      presence: {
        update: { status: "ONLINE", lastSeenAt: new Date() },
      },
    },
  });

  const loopBot = await prisma.user.findUnique({
    where: { clerkUserId: DEMO_BOT_CLERK_ID },
    select: { id: true },
  });
  if (loopBot) {
    await grantWalletCreditOnce({
      userId: loopBot.id,
      amountMicrocredits: 250_000_000n,
      idempotencyKey: "seed:learnloop-loop-bot-wallet",
      metadata: { reason: "seed_loop_bot" },
    });
  }

  await prisma.achievement.upsert({
    where: { key: "FIRST_HELP_REQUEST" },
    create: {
      key: "FIRST_HELP_REQUEST",
      name: "First doubt",
      description: "Posted your first help request.",
    },
    update: {},
  });

  await seedDemoEcosystem(prisma);

  console.info("Seed: Loop Bot + achievements + optional demo ecosystem complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
