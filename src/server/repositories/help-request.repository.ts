import { prisma } from "@/lib/db/prisma";

export const helpRequestRepository = {
  listOpenForFeed(params: { subjectSlug?: string; cursor?: string; take?: number }) {
    const take = params.take ?? 20;
    return prisma.helpRequest.findMany({
      where: { status: "OPEN", ...(params.subjectSlug ? { subjectSlug: params.subjectSlug } : {}) },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });
  },
};
