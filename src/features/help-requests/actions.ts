"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  HelpRequestStatus,
  LeaderboardScope,
  LeaderboardWindow,
  NotificationChannel,
  NotificationStatus,
  SessionStatus,
  TransactionType,
} from "@prisma/client";
import { prisma, prismaInteractiveTransactionOptions } from "@/lib/db/prisma";
import {
  STUDENT_SESSION_FEE_MICRO,
  tutorPayoutMicrocreditsForRating,
} from "@/features/sessions/session-economics";
import { getLeaderboardDemoPeriodKey } from "@/lib/demo/leaderboard-period";
import { isLearnloopDemo } from "@/lib/demo/demo-flags";
import { getAppUserIdOrThrow, getAppUserOrThrow } from "@/lib/auth/app-user";
import { publishQueryInvalidate } from "@/lib/realtime/publish-invalidate";
import { publishSessionChatMessage } from "@/lib/realtime/publish-session-chat";
import { publishSessionStarted } from "@/lib/realtime/publish-session-started";
import { createHelpRequestSchema } from "@/features/help-requests/schema";
import { mockCategorize } from "@/features/help-requests/ai-mock";

const feedLimit = 20;

/** Learner fee on rating: off in LearnLoop demo mode or local `next dev` (so ratings work without wallet top-ups). Force in dev with LEARNLOOP_CHARGE_SESSION_FEE=1. */
function shouldDebitLearnerSessionFeeOnRating(): boolean {
  if (process.env.LEARNLOOP_CHARGE_SESSION_FEE === "1") return true;
  if (isLearnloopDemo()) return false;
  if (process.env.NODE_ENV !== "production") return false;
  return true;
}

function serializeRequest(row: {
  id: string;
  title: string;
  body: string;
  subjectSlug: string;
  topicSlug: string | null;
  urgency: string;
  preferredDurationMinutes: number;
  language: string;
  status: HelpRequestStatus;
  createdAt: Date;
  author: { id: string; profile: { displayName: string; avatarUrl: string | null } | null };
  aiTags: { tag: string; confidence: unknown }[];
  _count: { interests: number };
}) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    subjectSlug: row.subjectSlug,
    topicSlug: row.topicSlug,
    urgency: row.urgency,
    preferredDurationMinutes: row.preferredDurationMinutes,
    language: row.language,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    author: {
      id: row.author.id,
      displayName: row.author.profile?.displayName ?? "Learner",
      avatarUrl: row.author.profile?.avatarUrl ?? null,
    },
    tags: row.aiTags.map((t) => ({ tag: t.tag, confidence: Number(t.confidence ?? 0) })),
    interestCount: row._count.interests,
  };
}

export async function createHelpRequest(raw: unknown) {
  const user = await getAppUserOrThrow();
  const input = createHelpRequestSchema.parse(raw);

  const req = await prisma.$transaction(
    async (tx) => {
      const created = await tx.helpRequest.create({
        data: {
          authorId: user.id,
          title: input.title,
          body: input.body,
          subjectSlug: input.subjectSlug,
          topicSlug: input.topicSlug,
          urgency: input.urgency,
          preferredDurationMinutes: input.preferredDurationMinutes,
          language: input.language,
          status: HelpRequestStatus.OPEN,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const tags = mockCategorize({
        title: input.title,
        body: input.body,
        subjectSlug: input.subjectSlug,
      });

      await tx.aITag.createMany({
        data: tags.map((t) => ({
          entityKind: "HELP_REQUEST" as const,
          entityId: created.id,
          helpRequestId: created.id,
          tag: t.tag,
          confidence: t.confidence,
          model: "learnloop-mock-v1",
          promptVersion: "demo-1",
        })),
      });

      const ach = await tx.achievement.findUnique({ where: { key: "FIRST_HELP_REQUEST" } });
      if (ach) {
        await tx.userAchievement.upsert({
          where: { userId_achievementId: { userId: user.id, achievementId: ach.id } },
          create: { userId: user.id, achievementId: ach.id },
          update: {},
        });
      }

      return created;
    },
    prismaInteractiveTransactionOptions,
  );

  revalidatePath("/dashboard/requests");
  await publishQueryInvalidate({
    targets: [{ userIds: [user.id], keys: [["profile-dashboard"], ["leaderboard"]] }],
    broadcastKeys: [["requests-feed"]],
  });
  return { ok: true as const, id: req.id };
}

export async function getRequestsFeed(input: { cursor?: string | null; subject?: string; q?: string }) {
  await getAppUserIdOrThrow();

  const where = {
    status: HelpRequestStatus.OPEN,
    ...(input.subject ? { subjectSlug: input.subject } : {}),
    ...(input.q
      ? {
          OR: [
            { title: { contains: input.q, mode: "insensitive" as const } },
            { body: { contains: input.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  try {
    const rows = await prisma.helpRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: feedLimit + 1,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
      select: {
        id: true,
        title: true,
        body: true,
        subjectSlug: true,
        topicSlug: true,
        urgency: true,
        preferredDurationMinutes: true,
        language: true,
        status: true,
        createdAt: true,
        author: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        aiTags: { select: { tag: true, confidence: true } },
        _count: { select: { interests: true } },
      },
    });

    let nextCursor: string | null = null;
    let list = rows;
    if (rows.length > feedLimit) {
      nextCursor = rows[feedLimit - 1]?.id ?? null;
      list = rows.slice(0, feedLimit);
    }

    return { items: list.map(serializeRequest), nextCursor };
  } catch (err) {
    if (!isLearnloopDemo()) throw err;
    console.error("[LearnLoop demo] getRequestsFeed fallback:", err);
    return { items: [], nextCursor: null as string | null };
  }
}

export async function getRequestDetail(id: string) {
  const userId = await getAppUserIdOrThrow();
  const row = await prisma.helpRequest.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      body: true,
      subjectSlug: true,
      topicSlug: true,
      urgency: true,
      preferredDurationMinutes: true,
      language: true,
      status: true,
      createdAt: true,
      authorId: true,
      author: {
        select: {
          id: true,
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      },
      aiTags: { select: { tag: true, confidence: true } },
      interests: {
        select: {
          tutorUserId: true,
          createdAt: true,
          tutor: {
            select: {
              profile: {
                select: { displayName: true, avatarUrl: true, languages: true },
              },
              tutorProfile: {
                select: {
                  headline: true,
                  averageRating: true,
                  totalRatingsCount: true,
                  teachingSubjectSlugs: true,
                  verificationStatus: true,
                },
              },
            },
          },
        },
      },
      _count: { select: { interests: true } },
    },
  });
  if (!row) return null;

  const myInterest = row.interests.some((i) => i.tutorUserId === userId);

  const base = serializeRequest({
    id: row.id,
    title: row.title,
    body: row.body,
    subjectSlug: row.subjectSlug,
    topicSlug: row.topicSlug,
    urgency: row.urgency,
    preferredDurationMinutes: row.preferredDurationMinutes,
    language: row.language,
    status: row.status,
    createdAt: row.createdAt,
    author: row.author,
    aiTags: row.aiTags,
    _count: { interests: row._count.interests },
  });

  return {
    ...base,
    fullBody: row.body,
    authorId: row.authorId,
    viewerIsAuthor: userId === row.authorId,
    myInterest,
    interests: row.interests.map((i) => ({
      tutorUserId: i.tutorUserId,
      displayName: i.tutor.profile?.displayName ?? "Tutor",
      avatarUrl: i.tutor.profile?.avatarUrl ?? null,
      headline: i.tutor.tutorProfile?.headline ?? "",
      createdAt: i.createdAt.toISOString(),
      avgRating: i.tutor.tutorProfile?.averageRating != null ? Number(i.tutor.tutorProfile.averageRating) : null,
      ratingCount: i.tutor.tutorProfile?.totalRatingsCount ?? 0,
      tutorLanguages: Array.isArray(i.tutor.profile?.languages) ? (i.tutor.profile!.languages as string[]) : [],
      teachingSubjects: Array.isArray(i.tutor.tutorProfile?.teachingSubjectSlugs)
        ? (i.tutor.tutorProfile!.teachingSubjectSlugs as string[])
        : [],
      verificationStatus: i.tutor.tutorProfile?.verificationStatus ?? "NONE",
    })),
  };
}

export async function expressInterest(requestId: string) {
  const user = await getAppUserOrThrow();
  const req = await prisma.helpRequest.findFirst({
    where: { id: requestId, status: HelpRequestStatus.OPEN },
    select: { id: true, title: true, authorId: true },
  });
  if (!req) throw new Error("Request not available");
  if (req.authorId === user.id) throw new Error("Cannot express interest on own request");

  await prisma.$transaction(
    async (tx) => {
      await tx.helpRequestInterest.upsert({
        where: { requestId_tutorUserId: { requestId, tutorUserId: user.id } },
        create: { requestId, tutorUserId: user.id },
        update: {},
      });

      await tx.notification.create({
        data: {
          userId: req.authorId,
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.UNREAD,
          type: "TUTOR_INTEREST",
          title: "A tutor is interested",
          body: `${user.profile?.displayName ?? "Someone"} wants to help with: ${req.title}`,
          payload: { requestId, tutorUserId: user.id },
        },
      });
    },
    prismaInteractiveTransactionOptions,
  );

  revalidatePath("/dashboard/requests");
  revalidatePath(`/dashboard/requests/${requestId}`);
  await publishQueryInvalidate({
    targets: [
      { userIds: [req.authorId], keys: [["notifications"], ["request-detail", requestId], ["requests-feed"]] },
      { userIds: [user.id], keys: [["request-detail", requestId], ["requests-feed"]] },
    ],
  });
  return { ok: true as const };
}

export async function withdrawInterest(requestId: string) {
  const user = await getAppUserOrThrow();
  const req = await prisma.helpRequest.findUnique({
    where: { id: requestId },
    select: { authorId: true },
  });
  await prisma.helpRequestInterest.deleteMany({
    where: { requestId, tutorUserId: user.id },
  });
  revalidatePath("/dashboard/requests");
  revalidatePath(`/dashboard/requests/${requestId}`);
  if (req) {
    await publishQueryInvalidate({
      targets: [
        { userIds: [req.authorId, user.id], keys: [["request-detail", requestId], ["requests-feed"]] },
      ],
    });
  }
  return { ok: true as const };
}

const DEMO_BOT_CLERK_ID = "demo_bot_clerk_learnloop";

/** Solo-demo: seed bot tutor expresses interest on your open request. */
export async function simulateBotInterest(requestId: string) {
  const user = await getAppUserOrThrow();
  const bot = await prisma.user.findUnique({ where: { clerkUserId: DEMO_BOT_CLERK_ID } });
  if (!bot) throw new Error("Run `npx prisma db seed` to create the demo bot tutor.");

  const req = await prisma.helpRequest.findFirst({
    where: { id: requestId },
    select: { authorId: true, status: true },
  });
  if (!req || req.authorId !== user.id) throw new Error("Only the author can run demo interest");
  if (req.status !== HelpRequestStatus.OPEN) throw new Error("Request not open");

  await prisma.helpRequestInterest.upsert({
    where: { requestId_tutorUserId: { requestId, tutorUserId: bot.id } },
    create: { requestId, tutorUserId: bot.id },
    update: {},
  });

  revalidatePath("/dashboard/requests");
  revalidatePath(`/dashboard/requests/${requestId}`);
  await publishQueryInvalidate({
    targets: [{ userIds: [user.id], keys: [["request-detail", requestId], ["requests-feed"]] }],
  });
  return { ok: true as const };
}

const matchSchema = z.object({ requestId: z.string().cuid(), tutorUserId: z.string().cuid() });

export async function matchTutor(raw: unknown) {
  const user = await getAppUserOrThrow();
  const { requestId, tutorUserId } = matchSchema.parse(raw);

  const req = await prisma.helpRequest.findFirst({
    where: { id: requestId },
    select: { id: true, authorId: true, title: true, status: true },
  });
  if (!req || req.authorId !== user.id) throw new Error("Only the author can match");
  if (req.status !== HelpRequestStatus.OPEN) throw new Error("Request is not open");

  const session = await prisma.$transaction(
    async (tx) => {
      await tx.helpRequest.update({
        where: { id: requestId },
        data: {
          status: HelpRequestStatus.MATCHED,
          acceptedTutorId: tutorUserId,
        },
      });

      const s = await tx.session.create({
        data: {
          helpRequestId: requestId,
          studentId: req.authorId,
          tutorId: tutorUserId,
          status: SessionStatus.SCHEDULED,
        },
      });

      await tx.notification.create({
        data: {
          userId: tutorUserId,
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.UNREAD,
          type: "REQUEST_MATCHED",
          title: "You were chosen as tutor",
          body: `The learner matched with you for: ${req.title}. Open the session room when you are ready, then ask them to start the timer.`,
          payload: { requestId, sessionId: s.id },
        },
      });

      await tx.notification.create({
        data: {
          userId: req.authorId,
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.UNREAD,
          type: "REQUEST_MATCHED_STUDENT",
          title: "Tutor locked in",
          body: `You matched with a tutor for: ${req.title}. Open the session together; they will ask you to start when you are both ready.`,
          payload: { requestId, sessionId: s.id },
        },
      });

      return s;
    },
    prismaInteractiveTransactionOptions,
  );

  revalidatePath("/dashboard/requests");
  revalidatePath("/dashboard/sessions");
  revalidatePath(`/dashboard/sessions/${session.id}`);
  await publishQueryInvalidate({
    targets: [
      {
        userIds: [req.authorId],
        keys: [
          ["request-detail", requestId],
          ["requests-feed"],
          ["my-sessions"],
          ["profile-dashboard"],
          ["leaderboard"],
        ],
      },
      {
        userIds: [tutorUserId],
        keys: [["notifications"], ["request-detail", requestId], ["requests-feed"], ["my-sessions"]],
      },
    ],
  });
  return { ok: true as const, sessionId: session.id };
}

export async function getMySessions() {
  const userId = await getAppUserIdOrThrow();
  const rows = await prisma.session.findMany({
    where: { OR: [{ studentId: userId }, { tutorId: userId }] },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: {
      id: true,
      status: true,
      studentId: true,
      tutorId: true,
      updatedAt: true,
      helpRequest: { select: { title: true, subjectSlug: true } },
      student: { select: { profile: { select: { displayName: true } } } },
      tutor: { select: { profile: { select: { displayName: true } } } },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    status: s.status,
    title: s.helpRequest.title,
    subjectSlug: s.helpRequest.subjectSlug,
    updatedAt: s.updatedAt.toISOString(),
    role: s.studentId === userId ? ("student" as const) : ("tutor" as const),
    peerName:
      s.studentId === userId ? s.tutor.profile?.displayName ?? "Tutor" : s.student.profile?.displayName ?? "Student",
  }));
}

export async function listNotifications() {
  const userId = await getAppUserIdOrThrow();
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    status: n.status,
    createdAt: n.createdAt.toISOString(),
    payload: n.payload,
  }));
}

export async function markNotificationRead(id: string) {
  const userId = await getAppUserIdOrThrow();
  await prisma.notification.updateMany({
    where: { id, userId },
    data: { status: NotificationStatus.READ, readAt: new Date() },
  });
  revalidatePath("/dashboard");
  await publishQueryInvalidate({
    targets: [{ userIds: [userId], keys: [["notifications"]] }],
  });
  return { ok: true as const };
}

export async function markAllNotificationsRead() {
  const userId = await getAppUserIdOrThrow();
  await prisma.notification.updateMany({
    where: { userId, status: NotificationStatus.UNREAD },
    data: { status: NotificationStatus.READ, readAt: new Date() },
  });
  await publishQueryInvalidate({
    targets: [{ userIds: [userId], keys: [["notifications"]] }],
  });
  return { ok: true as const };
}

export async function sendSessionMessage(raw: unknown) {
  const userId = await getAppUserIdOrThrow();
  const schema = z.object({
    sessionId: z.string().cuid(),
    body: z.string().min(1).max(8000),
    clientMessageId: z.string().uuid(),
  });
  const input = schema.parse(raw);

  const session = await prisma.session.findFirst({
    where: {
      id: input.sessionId,
      OR: [{ studentId: userId }, { tutorId: userId }],
      status: { in: [SessionStatus.SCHEDULED, SessionStatus.ACTIVE] },
    },
  });
  if (!session) throw new Error("Session not found");

  const [created, profile] = await Promise.all([
    prisma.message.create({
      data: {
        sessionId: input.sessionId,
        senderId: userId,
        body: input.body,
        clientMessageId: input.clientMessageId,
      },
      select: { id: true, body: true, createdAt: true, senderId: true },
    }),
    prisma.profile.findUnique({ where: { userId }, select: { displayName: true } }),
  ]);

  const message = {
    id: created.id,
    body: created.body,
    createdAt: created.createdAt.toISOString(),
    senderId: created.senderId,
    senderName: profile?.displayName ?? "User",
  };

  void publishSessionChatMessage({ sessionId: input.sessionId, message });

  revalidatePath(`/dashboard/sessions/${input.sessionId}`);
  await publishQueryInvalidate({
    targets: [
      {
        userIds: [session.studentId, session.tutorId],
        keys: [["session", input.sessionId]],
      },
    ],
  });
  return { ok: true as const, message };
}

export async function getSessionBundle(sessionId: string) {
  const userId = await getAppUserIdOrThrow();
  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      OR: [{ studentId: userId }, { tutorId: userId }],
    },
    select: {
      id: true,
      status: true,
      startedAt: true,
      endedAt: true,
      startRequestedAt: true,
      helpRequest: { select: { title: true } },
      student: {
        select: {
          id: true,
          profile: { select: { displayName: true, avatarUrl: true } },
          presence: { select: { status: true } },
        },
      },
      tutor: {
        select: {
          id: true,
          profile: { select: { displayName: true, avatarUrl: true } },
          presence: { select: { status: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 120,
        select: {
          id: true,
          body: true,
          createdAt: true,
          senderId: true,
          sender: { select: { profile: { select: { displayName: true } } } },
        },
      },
      ratings: {
        select: { fromUserId: true, stars: true, comment: true, createdAt: true },
        take: 8,
      },
    },
  });
  if (!session) return null;

  const studentRating = session.ratings.find((r) => r.fromUserId === session.student.id) ?? null;
  const viewerCanRate =
    userId === session.student.id && session.status === SessionStatus.ENDED && !studentRating;
  const payoutMicro =
    studentRating != null ? tutorPayoutMicrocreditsForRating(studentRating.stars) : null;

  const startRequestedAt = session.startRequestedAt?.toISOString() ?? null;

  return {
    viewerId: userId,
    id: session.id,
    status: session.status,
    startedAt: session.startedAt?.toISOString() ?? null,
    endedAt: session.endedAt?.toISOString() ?? null,
    startRequestedAt,
    canRequestSessionStart:
      userId === session.tutor.id &&
      session.status === SessionStatus.SCHEDULED &&
      session.startRequestedAt == null,
    canConfirmSessionStart:
      userId === session.student.id &&
      session.status === SessionStatus.SCHEDULED &&
      session.startRequestedAt != null,
    requestTitle: session.helpRequest.title,
    student: {
      id: session.student.id,
      name: session.student.profile?.displayName ?? "Student",
      avatarUrl: session.student.profile?.avatarUrl ?? null,
      presence: session.student.presence?.status ?? "OFFLINE",
    },
    tutor: {
      id: session.tutor.id,
      name: session.tutor.profile?.displayName ?? "Tutor",
      avatarUrl: session.tutor.profile?.avatarUrl ?? null,
      presence: session.tutor.presence?.status ?? "OFFLINE",
    },
    messages: session.messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      senderId: m.senderId,
      senderName: m.sender.profile?.displayName ?? "User",
      isMine: m.senderId === userId,
    })),
    sessionRating: studentRating
      ? {
          stars: studentRating.stars,
          comment: studentRating.comment,
          createdAt: studentRating.createdAt.toISOString(),
        }
      : null,
    viewerCanRate,
    tutorSessionPayoutMicrocredits: payoutMicro != null ? payoutMicro.toString() : null,
    studentSessionFeeMicrocredits: shouldDebitLearnerSessionFeeOnRating()
      ? STUDENT_SESSION_FEE_MICRO.toString()
      : "0",
  };
}

export async function requestSessionStart(sessionId: string) {
  const userId = await getAppUserIdOrThrow();
  const s = await prisma.session.findFirst({
    where: { id: sessionId, tutorId: userId, status: SessionStatus.SCHEDULED },
    select: { id: true, studentId: true, helpRequestId: true, startRequestedAt: true },
  });
  if (!s) throw new Error("Only the tutor can request start, or the session is not in the waiting state.");

  if (s.startRequestedAt) {
    revalidatePath(`/dashboard/sessions/${sessionId}`);
    return { ok: true as const };
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { startRequestedAt: new Date() },
  });

  await prisma.notification.create({
    data: {
      userId: s.studentId,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.UNREAD,
      type: "SESSION_START_REQUESTED",
      title: "Tutor is ready",
      body: "Your tutor is ready to begin. Open this session and tap Start session to begin the timer.",
      payload: { sessionId },
    },
  });

  revalidatePath(`/dashboard/sessions/${sessionId}`);
  await publishQueryInvalidate({
    targets: [
      {
        userIds: [s.studentId, userId],
        keys: [["session", sessionId], ["my-sessions"], ["notifications"], ["request-detail", s.helpRequestId]],
      },
    ],
  });
  return { ok: true as const };
}

export async function confirmSessionStart(sessionId: string) {
  const userId = await getAppUserIdOrThrow();
  const s = await prisma.session.findFirst({
    where: {
      id: sessionId,
      studentId: userId,
      status: SessionStatus.SCHEDULED,
      startRequestedAt: { not: null },
    },
    select: { id: true, tutorId: true, studentId: true, helpRequestId: true },
  });
  if (!s) {
    throw new Error("Your tutor must request start first, or you are not the learner on this session.");
  }

  const updated = await prisma.session.updateMany({
    where: { id: sessionId, status: SessionStatus.SCHEDULED, studentId: userId, startRequestedAt: { not: null } },
    data: { status: SessionStatus.ACTIVE, startedAt: new Date(), startRequestedAt: null },
  });
  if (updated.count === 0) throw new Error("Session could not be started — refresh and try again.");

  await prisma.notification.create({
    data: {
      userId: s.tutorId,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.UNREAD,
      type: "SESSION_LIVE",
      title: "Session is live",
      body: "The learner started the timer. You can wrap up with Close session when you are finished.",
      payload: { sessionId },
    },
  });

  void publishSessionStarted({ sessionId });
  revalidatePath(`/dashboard/sessions/${sessionId}`);
  await publishQueryInvalidate({
    targets: [
      {
        userIds: [s.studentId, s.tutorId],
        keys: [["session", sessionId], ["my-sessions"], ["notifications"], ["request-detail", s.helpRequestId]],
      },
    ],
  });
  return { ok: true as const };
}

export async function endSession(sessionId: string) {
  const userId = await getAppUserIdOrThrow();
  const s = await prisma.session.findFirst({
    where: { id: sessionId, OR: [{ studentId: userId }, { tutorId: userId }] },
    select: {
      id: true,
      status: true,
      helpRequestId: true,
      studentId: true,
      tutorId: true,
    },
  });
  if (!s) throw new Error("Not found");
  if (s.status === SessionStatus.ENDED) {
    return { ok: true as const };
  }

  if (s.status === SessionStatus.SCHEDULED) {
    await prisma.$transaction([
      prisma.session.update({
        where: { id: sessionId },
        data: { status: SessionStatus.ENDED, endedAt: new Date() },
      }),
      prisma.helpRequest.update({
        where: { id: s.helpRequestId },
        data: { status: HelpRequestStatus.COMPLETED },
      }),
    ]);
  } else if (s.status === SessionStatus.ACTIVE) {
    await prisma.$transaction([
      prisma.session.update({
        where: { id: sessionId },
        data: { status: SessionStatus.ENDED, endedAt: new Date() },
      }),
      prisma.helpRequest.update({
        where: { id: s.helpRequestId },
        data: { status: HelpRequestStatus.COMPLETED },
      }),
      prisma.tutorProfile.updateMany({
        where: { userId: s.tutorId },
        data: { completedSessionCount: { increment: 1 } },
      }),
    ]);
  } else {
    throw new Error("Session cannot be ended from this state");
  }

  revalidatePath(`/dashboard/sessions/${sessionId}`);
  await publishQueryInvalidate({
    targets: [
      {
        userIds: [s.studentId, s.tutorId],
        keys: [
          ["session", sessionId],
          ["my-sessions"],
          ["request-detail", s.helpRequestId],
          ["profile-dashboard"],
          ["leaderboard"],
        ],
      },
    ],
  });
  return { ok: true as const };
}

const sessionRatingSchema = z.object({
  sessionId: z.string().cuid(),
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export async function submitSessionRating(raw: unknown) {
  const user = await getAppUserOrThrow();
  const input = sessionRatingSchema.parse(raw);

  const session = await prisma.session.findFirst({
    where: {
      id: input.sessionId,
      studentId: user.id,
      status: SessionStatus.ENDED,
    },
    select: { id: true, tutorId: true },
  });
  if (!session) throw new Error("Session not found or rating is not open yet");

  const existing = await prisma.rating.findUnique({
    where: { sessionId_fromUserId: { sessionId: input.sessionId, fromUserId: user.id } },
  });
  if (existing) throw new Error("You already rated this session");

  const idempotencyKey = `tutor-session-payout:${input.sessionId}`;
  const dupPayout = await prisma.transaction.findUnique({ where: { idempotencyKey } });
  if (dupPayout) {
    return {
      ok: true as const,
      tutorPayoutMicrocredits: dupPayout.amountMicrocredits.toString(),
      studentSessionFeeMicrocredits: shouldDebitLearnerSessionFeeOnRating()
        ? STUDENT_SESSION_FEE_MICRO.toString()
        : "0",
    };
  }

  const amountMicro = tutorPayoutMicrocreditsForRating(input.stars);
  const commentTrim = input.comment?.trim();

  await prisma.$transaction(
    async (tx) => {
      await tx.rating.create({
        data: {
          sessionId: input.sessionId,
          fromUserId: user.id,
          toUserId: session.tutorId,
          stars: input.stars,
          comment: commentTrim ? commentTrim : null,
        },
      });

      const agg = await tx.rating.aggregate({
        where: { toUserId: session.tutorId },
        _avg: { stars: true },
        _count: { _all: true },
      });

      await tx.tutorProfile.updateMany({
        where: { userId: session.tutorId },
        data: {
          ...(agg._avg.stars != null ? { averageRating: agg._avg.stars } : {}),
          totalRatingsCount: agg._count._all,
        },
      });

      let wallet = await tx.creditWallet.findUnique({ where: { userId: session.tutorId } });
      if (!wallet) {
        wallet = await tx.creditWallet.create({ data: { userId: session.tutorId } });
      }

      const nextBalance = wallet.balanceMicrocredits + amountMicro;
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          actorUserId: user.id,
          type: TransactionType.CREDIT,
          amountMicrocredits: amountMicro,
          balanceAfterMicrocredits: nextBalance,
          idempotencyKey,
          referenceKind: "SESSION_RATING",
          referenceId: input.sessionId,
          metadata: { stars: input.stars },
        },
      });

      await tx.creditWallet.update({
        where: { id: wallet.id },
        data: {
          balanceMicrocredits: nextBalance,
          version: { increment: 1 },
        },
      });

      const studentFeeKey = `student-session-fee:${input.sessionId}`;
      const dupStudentFee = await tx.transaction.findUnique({ where: { idempotencyKey: studentFeeKey } });
      if (!dupStudentFee && shouldDebitLearnerSessionFeeOnRating()) {
        let studentWallet = await tx.creditWallet.findUnique({ where: { userId: user.id } });
        if (!studentWallet) {
          studentWallet = await tx.creditWallet.create({ data: { userId: user.id } });
        }
        if (studentWallet.balanceMicrocredits < STUDENT_SESSION_FEE_MICRO) {
          throw new Error(
            "Not enough credits in your wallet to pay the session fee. Add credits from Profile, or set NEXT_PUBLIC_LEARNLOOP_DEMO=1 in dev for a waived demo fee.",
          );
        }
        const nextStudentBal = studentWallet.balanceMicrocredits - STUDENT_SESSION_FEE_MICRO;
        await tx.transaction.create({
          data: {
            walletId: studentWallet.id,
            actorUserId: user.id,
            type: TransactionType.DEBIT,
            amountMicrocredits: -STUDENT_SESSION_FEE_MICRO,
            balanceAfterMicrocredits: nextStudentBal,
            idempotencyKey: studentFeeKey,
            referenceKind: "SESSION_RATING",
            referenceId: input.sessionId,
            metadata: { kind: "learner_session_fee" },
          },
        });
        await tx.creditWallet.update({
          where: { id: studentWallet.id },
          data: {
            balanceMicrocredits: nextStudentBal,
            version: { increment: 1 },
          },
        });
      }
    },
    prismaInteractiveTransactionOptions,
  );

  revalidatePath(`/dashboard/sessions/${input.sessionId}`);
  revalidatePath("/dashboard/profile");
  await publishQueryInvalidate({
    targets: [
      {
        userIds: [session.tutorId, user.id],
        keys: [["session", input.sessionId], ["my-sessions"], ["profile-dashboard"], ["leaderboard"]],
      },
    ],
  });

  return {
    ok: true as const,
    tutorPayoutMicrocredits: amountMicro.toString(),
    studentSessionFeeMicrocredits: shouldDebitLearnerSessionFeeOnRating()
      ? STUDENT_SESSION_FEE_MICRO.toString()
      : "0",
  };
}

export async function getLeaderboardRows() {
  await getAppUserIdOrThrow();
  const periodKey = getLeaderboardDemoPeriodKey();

  try {
    const rows = await prisma.leaderboardStats.findMany({
      where: { window: LeaderboardWindow.MONTHLY, periodKey, scope: LeaderboardScope.GLOBAL },
      orderBy: { points: "desc" },
      take: 12,
      include: {
        user: {
          select: {
            id: true,
            profile: { select: { displayName: true, avatarUrl: true } },
            tutorProfile: { select: { headline: true } },
          },
        },
      },
    });

    if (rows.length >= 3) {
      return rows.map((r, i) => ({
        rank: i + 1,
        userId: r.userId,
        name: r.user.profile?.displayName ?? "Learner",
        avatarUrl: r.user.profile?.avatarUrl ?? null,
        points: r.points,
        streak: 0,
        tier: i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "standard",
      }));
    }
  } catch (e) {
    if (!isLearnloopDemo()) throw e;
    console.error("[LearnLoop demo] leaderboard fallback:", e);
  }

  /** Demo fallback when DB empty — judges still see a podium. */
  return [
    { rank: 1, userId: "demo-1", name: "Morgan Chen", avatarUrl: null, points: 2840, streak: 14, tier: "gold" as const },
    { rank: 2, userId: "demo-2", name: "Riley Park", avatarUrl: null, points: 2510, streak: 9, tier: "silver" as const },
    { rank: 3, userId: "demo-3", name: "Jordan Lee", avatarUrl: null, points: 2395, streak: 21, tier: "bronze" as const },
    { rank: 4, userId: "demo-4", name: "Casey Ali", avatarUrl: null, points: 1980, streak: 4, tier: "standard" as const },
    { rank: 5, userId: "demo-5", name: "Sam Rivera", avatarUrl: null, points: 1760, streak: 6, tier: "standard" as const },
  ];
}

export async function getProfileDashboard() {
  const user = await getAppUserOrThrow();
  const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
  const [authored, sessionsTaught, sessionsLearned, achievements, recentTaught] = await Promise.all([
    prisma.helpRequest.count({ where: { authorId: user.id } }),
    prisma.session.count({ where: { tutorId: user.id, status: "ENDED" } }),
    prisma.session.count({ where: { studentId: user.id, status: "ENDED" } }),
    prisma.userAchievement.findMany({
      where: { userId: user.id },
      include: { achievement: true },
      orderBy: { earnedAt: "desc" },
      take: 8,
    }),
    prisma.session.count({
      where: { tutorId: user.id, status: "ENDED", endedAt: { gte: since } },
    }),
  ]);

  const slugs = Array.isArray(user.profile?.learningSubjectSlugs) ? (user.profile!.learningSubjectSlugs as string[]) : [];
  const strengths = mockCategorize({
    title: "Profile",
    body: user.profile?.bio ?? user.tutorProfile?.headline ?? "peer learning",
    subjectSlug: slugs[0] ?? "general",
  }).map((t) => t.tag);

  return {
    user: {
      id: user.id,
      displayName: user.profile?.displayName ?? "Learner",
      bio: user.profile?.bio,
      avatarUrl: user.profile?.avatarUrl,
      campusSlug: user.profile?.campusSlug,
      institutionVerificationEmail: user.profile?.institutionVerificationEmail ?? null,
      institutionVerifiedAt: user.profile?.institutionVerifiedAt?.toISOString() ?? null,
      headline: user.tutorProfile?.headline,
      avgRating: user.tutorProfile?.averageRating ? Number(user.tutorProfile.averageRating) : null,
      completedSessions: user.tutorProfile?.completedSessionCount ?? 0,
    },
    stats: {
      doubtsPosted: authored,
      sessionsTaught,
      sessionsLearned,
      teachingStreakSessions: Math.min(12, recentTaught),
    },
    achievements: achievements.map((a) => ({
      key: a.achievement.key,
      name: a.achievement.name,
      earnedAt: a.earnedAt.toISOString(),
    })),
    aiStrengths: strengths,
  };
}
