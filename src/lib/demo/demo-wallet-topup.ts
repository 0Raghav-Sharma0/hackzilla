import { TransactionType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isLearnloopDemo } from "@/lib/demo/demo-flags";

/** One-time demo balance so session fee + rating flows work without manual wallet setup (~200 “credits” at 1e6 display scale). */
export const DEMO_WALLET_TOPUP_MICRO = 200_000_000n;

export type GrantWalletCreditOnceInput = {
  userId: string;
  amountMicrocredits: bigint;
  idempotencyKey: string;
  referenceKind?: string;
  metadata?: Record<string, unknown>;
};

/** Idempotent ledger CREDIT — used by Prisma seed / demo ecosystem (no env flag). */
export async function grantWalletCreditOnce(input: GrantWalletCreditOnceInput): Promise<void> {
  const { userId, amountMicrocredits, idempotencyKey } = input;
  const referenceKind = input.referenceKind ?? "ADJUSTMENT";

  await prisma.$transaction(async (tx) => {
    const dup = await tx.transaction.findUnique({ where: { idempotencyKey } });
    if (dup) return;

    let wallet = await tx.creditWallet.findUnique({ where: { userId } });
    if (!wallet) {
      wallet = await tx.creditWallet.create({ data: { userId } });
    }

    const next = wallet.balanceMicrocredits + amountMicrocredits;
    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        actorUserId: userId,
        type: TransactionType.CREDIT,
        amountMicrocredits: amountMicrocredits,
        balanceAfterMicrocredits: next,
        idempotencyKey,
        referenceKind,
        referenceId: userId,
        metadata: (input.metadata ?? undefined) as object | undefined,
      },
    });
    await tx.creditWallet.update({
      where: { id: wallet.id },
      data: { balanceMicrocredits: next, version: { increment: 1 } },
    });
  });
}

/**
 * Idempotent signup bonus when `NEXT_PUBLIC_LEARNLOOP_DEMO=1`.
 * Safe to call after every Clerk sync; skips if the ledger row already exists.
 */
export async function ensureLearnloopDemoWalletTopUp(userId: string): Promise<void> {
  if (!isLearnloopDemo()) return;

  await grantWalletCreditOnce({
    userId,
    amountMicrocredits: DEMO_WALLET_TOPUP_MICRO,
    idempotencyKey: `learnloop-demo-wallet-topup:${userId}`,
    metadata: { reason: "learnloop_demo_signup" },
  });
}
