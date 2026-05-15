import {
  HelpRequestStatus,
  LeaderboardScope,
  LeaderboardWindow,
  MessageType,
  NotificationChannel,
  NotificationStatus,
  PresenceStatus,
  SessionStatus,
  SessionSummaryStatus,
  UserRole,
  type PrismaClient,
} from "@prisma/client";
import { getLeaderboardDemoPeriodKey } from "../src/lib/demo/leaderboard-period";
import { DEMO_WALLET_TOPUP_MICRO, grantWalletCreditOnce } from "../src/lib/demo/demo-wallet-topup";

const PREFIX = "demo_ecosystem_";

const CAMPUSES = ["riverside-tech", "harbor-poly", "summit-state", "northline-u", "cascade-college"] as const;
const SUBJECTS = ["calculus", "linear-algebra", "physics", "cs-fundamentals", "statistics", "chemistry"] as const;

const FIRST_NAMES = [
  "Morgan", "Riley", "Jordan", "Casey", "Avery", "Quinn", "Skyler", "Reese", "Rowan", "Emerson", "Cameron", "Dakota",
  "Harper", "Logan", "Parker", "Sage", "River", "Phoenix", "Blair", "Eden", "Marlowe", "Indigo", "Jules", "Alex",
  "Sam", "Taylor", "Jamie", "Charlie", "Finley", "Hayden", "Kendall", "Lane", "Micah", "Noel", "Oakley", "Peyton",
  "Remy", "Shay", "Tatum", "Val", "Winter", "Zion", "Adrian", "Bianca", "Caleb", "Diana", "Ethan", "Fiona", "Gabe",
  "Helena", "Ivan", "Jade", "Kai", "Lena", "Marco", "Nina", "Omar", "Priya", "Rosa",
];

const LAST_NAMES = [
  "Chen", "Park", "Rivera", "Nguyen", "Patel", "Okonkwo", "Silva", "Martinez", "Kim", "Hassan", "Berg", "Nakamura",
  "Okafor", "Lopez", "Frost", "Abbott", "Singh", "Carvalho", "Yamamoto", "Petrov", "Costa", "Alvarez", "Brooks",
  "Hayes", "Morales", "Choi", "Tanaka", "Ibrahim", "Kowalski", "Dubois", "Schmidt", "Andersen", "Rossi", "Garcia",
  "Olsen", "Johansson", "Khan", "Shah", "Mehta", "Kapoor", "Desai", "Cohen", "Levy", "Novak", "Santos", "Reyes",
];

const TUTOR_HEADLINES = [
  "I break hard proofs into checkpoints you can actually remember.",
  "Exam-prep specialist — we drill patterns until they feel automatic.",
  "I teach intuition first, algebra second. Less memorizing, more seeing.",
  "Former TA — I know exactly where students get stuck on this topic.",
  "We whiteboard slowly, then speed-run past papers until you’re bored of winning.",
  "I love turning “I’m lost” into “oh, it’s just two ideas stacked.”",
];

const STUDENT_BIOS = [
  "Junior · robotics club · trying to survive thermo and linear at the same time.",
  "CS + math double — I learn best by teaching back, still figuring out proofs.",
  "Pre-med track — physics intuition is my weak spot; I grind flashcards nightly.",
  "Transfer student — catching up on calculus-based physics this semester.",
  "Night owl learner — async notes + live sessions keep me honest.",
];

const DOUBT_OPENERS = [
  "Stuck on",
  "Need intuition for",
  "Exam in 48h — help with",
  "Concept check:",
  "Why does",
  "Walk me through",
  "Small group confused about",
  "Proof strategy for",
];

const DOUBT_TOPICS: Record<(typeof SUBJECTS)[number], string[]> = {
  calculus: [
    "ε–δ limit rigor for a removable discontinuity",
    "implicit differentiation on a related-rates ladder problem",
    "surface integral setup for a paraboloid cap",
    "Taylor remainder bound for an alternating series",
    "u-substitution vs trig sub for a nasty radical",
  ],
  "linear-algebra": [
    "change-of-basis for a rotation in R2",
    "why row rank equals column rank — intuitive proof sketch",
    "positive semidefinite vs definite from eigenvalues",
    "least squares with rank-deficient design matrix",
    "Jordan form intuition without drowning in computation",
  ],
  physics: [
    "phase shift in driven damped harmonic oscillator",
    "why boundary conditions quantize a particle in a box",
    "rolling without slipping — choosing the instant center",
    "Snell’s law from Fermat vs Huygens — connecting frames",
    "relativistic momentum when v is large but not c",
  ],
  "cs-fundamentals": [
    "proving O(n log n) for merge sort recurrence cleanly",
    "hash table resizing amortized analysis intuition",
    "DFS vs BFS when the graph is implicit",
    "master theorem edge case when f(n) grows oddly",
    "red-black tree rotations — what invariant actually saves us",
  ],
  statistics: [
    "MLE vs method of moments on a shifted exponential",
    "why CI width shrinks with sqrt(n) — intuition + algebra",
    "Bayesian updating with a conjugate prior walkthrough",
    "Type I vs II errors in a two-sample test",
    "conditional expectation trick on a bivariate normal",
  ],
  chemistry: [
    "Gibbs free energy driving a redox couple",
    "molecular orbital picture for O2 paramagnetism",
    "buffer capacity near pKa — quantitative intuition",
    "rate law from mechanism with a fast pre-equilibrium",
    "VSEPR exceptions that actually show up on exams",
  ],
};

const AI_TAG_POOL = [
  "exam-prep",
  "conceptual",
  "proof-heavy",
  "intuition-first",
  "short session",
  "deep-dive",
  "common-mistake",
  "visual learner",
  "algebra-heavy",
  "physics-intuition",
  "recurrence",
  "linear-systems",
  "confidence-interval",
  "mechanism-design",
];

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

function daysAgo(rand: () => number, maxDays: number) {
  const d = new Date();
  d.setHours(10 + Math.floor(rand() * 10), Math.floor(rand() * 55), 0, 0);
  d.setDate(d.getDate() - Math.floor(rand() * maxDays));
  return d;
}

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

async function wipeDemoEcosystem(prisma: PrismaClient) {
  const users = await prisma.user.findMany({
    where: { clerkUserId: { startsWith: PREFIX } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  if (!ids.length) return;

  await prisma.helpRequestInterest.deleteMany({ where: { tutorUserId: { in: ids } } });

  const requests = await prisma.helpRequest.findMany({
    where: { authorId: { in: ids } },
    select: { id: true },
  });
  const hrIds = requests.map((r) => r.id);

  const sessions = await prisma.session.findMany({
    where: { OR: [{ studentId: { in: ids } }, { tutorId: { in: ids } }] },
    select: { id: true },
  });
  const sessIds = sessions.map((s) => s.id);

  if (sessIds.length) {
    await prisma.message.deleteMany({ where: { sessionId: { in: sessIds } } });
    await prisma.rating.deleteMany({ where: { sessionId: { in: sessIds } } });
    await prisma.sessionSummary.deleteMany({ where: { sessionId: { in: sessIds } } });
    await prisma.session.deleteMany({ where: { id: { in: sessIds } } });
  }

  await prisma.helpRequestInterest.deleteMany({ where: { requestId: { in: hrIds } } });
  await prisma.aITag.deleteMany({ where: { helpRequestId: { in: hrIds } } });
  await prisma.helpRequest.deleteMany({ where: { id: { in: hrIds } } });

  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.userAchievement.deleteMany({ where: { userId: { in: ids } } });
  await prisma.leaderboardStats.deleteMany({ where: { userId: { in: ids } } });

  const wallets = await prisma.creditWallet.findMany({ where: { userId: { in: ids } }, select: { id: true } });
  const walletIds = wallets.map((w) => w.id);
  if (walletIds.length) {
    await prisma.transaction.deleteMany({ where: { walletId: { in: walletIds } } });
  }
  await prisma.creditWallet.deleteMany({ where: { userId: { in: ids } } });
  await prisma.userPresence.deleteMany({ where: { userId: { in: ids } } });
  await prisma.tutorProfile.deleteMany({ where: { userId: { in: ids } } });
  await prisma.profile.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

export async function seedDemoEcosystem(prisma: PrismaClient) {
  if (process.env.DEMO_ECOSYSTEM_SEED !== "1") {
    console.info("Demo ecosystem: set DEMO_ECOSYSTEM_SEED=1 to wipe + insert 50+ users and 100+ requests.");
    return;
  }

  await wipeDemoEcosystem(prisma);

  const rand = mulberry32(0x5eedc0de);
  const periodKey = getLeaderboardDemoPeriodKey();
  const userRows: { id: string; isTutor: boolean }[] = [];
  const tutorIds: string[] = [];
  const studentIds: string[] = [];

  const N = 56;
  const TUTOR_COUNT = 22;

  for (let i = 0; i < N; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length]!;
    const ln = LAST_NAMES[(i * 3) % LAST_NAMES.length]!;
    const displayName = `${fn} ${ln}`;
    const isTutor = i < TUTOR_COUNT;
    const campus = pick(rand, CAMPUSES);
    const slug = `${PREFIX}u_${String(i).padStart(4, "0")}`;
    const subjects = [pick(rand, SUBJECTS), pick(rand, SUBJECTS)].filter((v, j, a) => a.indexOf(v) === j);

    const user = await prisma.user.create({
      data: {
        clerkUserId: slug,
        email: `${slug}@learnloop.demo`,
        role: UserRole.STUDENT,
        profile: {
          create: {
            displayName,
            bio: isTutor ? pick(rand, TUTOR_HEADLINES) : pick(rand, STUDENT_BIOS),
            avatarUrl: avatarUrl(displayName),
            campusSlug: campus,
            learningSubjectSlugs: subjects,
            languages: ["en"],
          },
        },
        wallet: { create: {} },
        presence: {
          create: {
            status: rand() > 0.35 ? PresenceStatus.ONLINE : rand() > 0.5 ? PresenceStatus.AWAY : PresenceStatus.BUSY,
            lastSeenAt: daysAgo(rand, 3),
          },
        },
        ...(isTutor
          ? {
              tutorProfile: {
                create: {
                  headline: pick(rand, TUTOR_HEADLINES),
                  teachingSubjectSlugs: [...subjects, pick(rand, SUBJECTS)],
                  completedSessionCount: 12 + Math.floor(rand() * 180),
                  averageRating: 4.2 + rand() * 0.75,
                  totalRatingsCount: 8 + Math.floor(rand() * 90),
                  isAcceptingRequests: true,
                  verificationStatus: rand() > 0.15 ? "VERIFIED" : "PENDING",
                },
              },
            }
          : {}),
      },
    });
    userRows.push({ id: user.id, isTutor });
    if (isTutor) tutorIds.push(user.id);
    else studentIds.push(user.id);
  }

  for (const row of userRows) {
    await grantWalletCreditOnce({
      userId: row.id,
      amountMicrocredits: DEMO_WALLET_TOPUP_MICRO,
      idempotencyKey: `demo-ecosystem-wallet:${row.id}`,
      metadata: { reason: "demo_ecosystem_seed" },
    });
  }

  const achievements = [
    { key: "FIRST_HELP_REQUEST", name: "First doubt", description: "Posted your first help request." },
    { key: "STREAK_7", name: "Week streak", description: "Seven days of learning activity." },
    { key: "SESSION_10", name: "Ten sessions", description: "Completed ten teaching or learning sessions." },
    { key: "CAMPUS_TOP", name: "Campus contender", description: "Cracked the campus leaderboard top 10." },
    { key: "HELPER", name: "Community helper", description: "Expressed interest on 25+ doubts." },
  ] as const;

  for (const a of achievements) {
    await prisma.achievement.upsert({
      where: { key: a.key },
      create: { key: a.key, name: a.name, description: a.description },
      update: { name: a.name, description: a.description },
    });
  }

  const achRecords = await prisma.achievement.findMany({
    where: { key: { in: achievements.map((x) => x.key) } },
  });

  for (const uid of userRows.slice(0, 40).map((u) => u.id)) {
    const picks = [...achRecords].sort(() => rand() - 0.5).slice(0, rand() > 0.35 ? 2 : 1);
    for (const ar of picks) {
      await prisma.userAchievement.upsert({
        where: { userId_achievementId: { userId: uid, achievementId: ar.id } },
        create: { userId: uid, achievementId: ar.id, earnedAt: daysAgo(rand, 40) },
        update: {},
      });
    }
  }

  const openCount = 108;
  for (let i = 0; i < openCount; i++) {
    const authorId = pick(rand, studentIds.length ? studentIds : tutorIds);
    const sub = pick(rand, SUBJECTS);
    const topic = pick(rand, DOUBT_TOPICS[sub]);
    const title = `${pick(rand, DOUBT_OPENERS)} ${topic}`;
    const body = `${title}.\n\nContext: I can follow the lecture examples, but when the parameters change I freeze. I’d love a 20–30 minute walkthrough plus 2–3 practice variants to try solo after.`;
    const urgency = rand() > 0.72 ? "HIGH" : rand() > 0.45 ? "MEDIUM" : "LOW";
    const dur = [25, 30, 35, 40, 45, 50, 60][Math.floor(rand() * 7)]!;
    const createdAt = daysAgo(rand, 14);

    const req = await prisma.helpRequest.create({
      data: {
        authorId,
        title,
        body,
        subjectSlug: sub,
        topicSlug: topic.slice(0, 48).toLowerCase().replace(/\s+/g, "-"),
        status: HelpRequestStatus.OPEN,
        urgency,
        preferredDurationMinutes: dur,
        language: "en",
        expiresAt: new Date(Date.now() + 7 * 86400000),
        createdAt,
      },
    });

    const nTags = 2 + Math.floor(rand() * 3);
    const usedTags = new Set<string>();
    for (let t = 0; t < nTags; t++) {
      let tag = pick(rand, AI_TAG_POOL);
      while (usedTags.has(tag)) tag = pick(rand, AI_TAG_POOL);
      usedTags.add(tag);
      await prisma.aITag.create({
        data: {
          entityKind: "HELP_REQUEST",
          entityId: req.id,
          helpRequestId: req.id,
          tag,
          confidence: 0.55 + rand() * 0.42,
          model: "learnloop-seed-v1",
          promptVersion: "demo-ecosystem",
        },
      });
    }

    const k = 1 + Math.floor(rand() * 5);
    const pool = tutorIds.filter((tid) => tid !== authorId);
    const shuffled = [...pool].sort(() => rand() - 0.5);
    for (const tid of shuffled.slice(0, k)) {
      await prisma.helpRequestInterest.create({
        data: {
          requestId: req.id,
          tutorUserId: tid,
          createdAt: new Date(createdAt.getTime() + Math.floor(rand() * 3600000)),
        },
      });
    }
  }

  const closed = 22;
  for (let i = 0; i < closed; i++) {
    const studentId = pick(rand, studentIds);
    const tutorId = pick(rand, tutorIds.filter((t) => t !== studentId));
    const sub = pick(rand, SUBJECTS);
    const topic = pick(rand, DOUBT_TOPICS[sub]);
    const title = `Resolved: ${topic}`;
    const body = `Archived doubt — we finished this in a live session. Keeping the text for searchability on campus.`;
    const createdAt = daysAgo(rand, 45);

    await prisma.helpRequest.create({
      data: {
        authorId: studentId,
        title,
        body,
        subjectSlug: sub,
        status: HelpRequestStatus.COMPLETED,
        urgency: "MEDIUM",
        preferredDurationMinutes: 40,
        language: "en",
        acceptedTutorId: tutorId,
        createdAt,
        session: {
          create: {
            studentId,
            tutorId,
            status: SessionStatus.ENDED,
            startedAt: new Date(createdAt.getTime() + 86400000),
            endedAt: new Date(createdAt.getTime() + 86400000 + 2400000),
            messages: {
              create: [
                { senderId: studentId, type: MessageType.TEXT, body: "Thanks for hopping on — I’m stuck at the setup step." },
                { senderId: tutorId, type: MessageType.TEXT, body: "Let’s draw the diagram together; the trick is labeling axes before equations." },
                { senderId: studentId, type: MessageType.TEXT, body: "That clicked. I’ll try two variants and ping you if I stall." },
              ],
            },
            summaries: {
              create: {
                status: SessionSummaryStatus.COMPLETED,
                content:
                  "## Recap\n\n- Reframed the problem as conservation + boundary conditions\n- Identified the classic sign error in the integral limits\n- Assigned two spaced-repetition drills for tomorrow",
                keyPoints: ["Boundary setup", "Sign discipline", "Drill plan"],
                model: "learnloop-seed-v1",
                promptVersion: "recap-seed",
              },
            },
            ratings: {
              create: {
                fromUserId: studentId,
                toUserId: tutorId,
                stars: 4 + Math.floor(rand() * 2),
                comment:
                  rand() > 0.5
                    ? "Patient explanations — I finally see why the shortcut works."
                    : "Clear structure, great use of analogies. Would book again.",
              },
            },
          },
        },
      },
    });
  }

  const notifBodies = [
    "A tutor matched your doubt — the session room is open whenever you are.",
    "You climbed two spots on the monthly leaderboard after last night’s sessions.",
    "Your AI roadmap refreshed with new milestones based on topics you struggled with.",
    "Campus pulse: Harbor Poly cut Riverside Tech’s lead by forty points this week.",
    "+180 credits posted to your wallet from a completed teaching block.",
    "Someone you helped left a five-star note about your explanations — thank you.",
    "Reminder: you have an active session in twenty minutes with Jordan.",
    "A new doubt in linear algebra overlaps subjects you teach — want first look?",
  ];

  for (let i = 0; i < 30; i++) {
    const uid = pick(rand, userRows.map((u) => u.id));
    await prisma.notification.create({
      data: {
        userId: uid,
        channel: NotificationChannel.IN_APP,
        status: rand() > 0.4 ? NotificationStatus.READ : NotificationStatus.UNREAD,
        type: "DEMO_DIGEST",
        title: pick(rand, ["Momentum", "New match", "Campus pulse", "Credits in", "Insight ready", "Session soon", "Community"]),
        body: pick(rand, notifBodies),
        payload: { demo: true },
        createdAt: daysAgo(rand, 6),
      },
    });
  }

  const ranked = [...userRows].sort(() => rand() - 0.5).slice(0, 24);
  let pts = 3200;
  for (let r = 0; r < ranked.length; r++) {
    const u = ranked[r]!;
    pts -= 40 + Math.floor(rand() * 120);
    await prisma.leaderboardStats.create({
      data: {
        userId: u.id,
        scope: LeaderboardScope.GLOBAL,
        window: LeaderboardWindow.MONTHLY,
        periodKey,
        campusSlug: "",
        points: Math.max(120, pts),
        sessionsCount: 5 + Math.floor(rand() * 40),
        creditsEarnedMicro: BigInt(1_000_000 * (20 + Math.floor(rand() * 200))),
      },
    });
  }

  console.info(`Demo ecosystem: ${N} users, ${openCount} open doubts, ${closed} completed arcs, leaderboard period ${periodKey}.`);
}
