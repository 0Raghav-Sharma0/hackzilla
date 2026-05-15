import type { Prisma, TransactionType } from "@prisma/client";
import { prisma, prismaInteractiveTransactionOptions } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";

/**
 * Credit domain service — WHY: All balance mutations go through one module using DB transactions.
 * Implementation is intentionally minimal; expand with HOLD/SETTLE flows.
 */
export async function appendLedgerEntry(params: {
  walletId: string;
  actorUserId?: string | null;
  type: TransactionType;
  amountMicrocredits: bigint;
  referenceKind: string;
  referenceId?: string | null;
  idempotencyKey?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      const wallet = await tx.creditWallet.findUnique({ where: { id: params.walletId } });
      if (!wallet) throw AppError.notFound("Wallet not found");

      const nextBalance = wallet.balanceMicrocredits + params.amountMicrocredits;
      if (nextBalance < 0n) {
        throw AppError.insufficientCredits();
      }

      if (params.idempotencyKey) {
        const existing = await tx.transaction.findUnique({
          where: { idempotencyKey: params.idempotencyKey },
        });
        if (existing) {
          throw AppError.conflict("Duplicate idempotency key", { existingId: existing.id });
        }
      }

      await tx.transaction.create({
        data: {
          walletId: params.walletId,
          actorUserId: params.actorUserId ?? undefined,
          type: params.type,
          amountMicrocredits: params.amountMicrocredits,
          balanceAfterMicrocredits: nextBalance,
          idempotencyKey: params.idempotencyKey ?? undefined,
          referenceKind: params.referenceKind,
          referenceId: params.referenceId ?? undefined,
          metadata: params.metadata,
        },
      });

      await tx.creditWallet.update({
        where: { id: params.walletId },
        data: {
          balanceMicrocredits: nextBalance,
          version: { increment: 1 },
        },
      });
    },
    prismaInteractiveTransactionOptions,
  );
}
