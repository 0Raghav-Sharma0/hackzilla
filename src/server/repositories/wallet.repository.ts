import { prisma } from "@/lib/db/prisma";

export const walletRepository = {
  findByUserId(userId: string) {
    return prisma.creditWallet.findUnique({ where: { userId } });
  },
};
