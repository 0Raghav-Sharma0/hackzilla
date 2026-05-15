import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export const userRepository = {
  findByClerkId(clerkUserId: string, include?: Prisma.UserInclude) {
    return prisma.user.findUnique({ where: { clerkUserId }, include });
  },

  findById(id: string, include?: Prisma.UserInclude) {
    return prisma.user.findUnique({ where: { id }, include });
  },
};
