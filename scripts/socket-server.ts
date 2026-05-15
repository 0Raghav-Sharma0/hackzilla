/**
 * Dev / sidecar Socket.IO server — WHY: Next.js has no first-class WebSocket in App Router; this tier pushes
 * invalidation + session whiteboard without polling every few seconds.
 *
 * Run: `npm run dev:realtime` (starts Next + this script) or `npx tsx scripts/socket-server.ts` beside `next dev`.
 */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { Server } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "../src/server/socket/events";
import { verifySocketToken } from "../src/lib/realtime/socket-token";
import type { InvalidatePublishPayload } from "../src/lib/realtime/publish-invalidate";
import type {
  MessageNewEventPayload,
  SessionSubscribePayload,
  WhiteboardStrokePayload,
} from "../src/server/socket/events";

function loadEnvFiles() {
  for (const f of [".env.local", ".env"]) {
    if (!existsSync(f)) continue;
    const text = readFileSync(f, "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq <= 0) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

loadEnvFiles();

const PORT = Number.parseInt(process.env.SOCKET_PORT ?? "3001", 10);
const SOCKET_JWT_SECRET = process.env.SOCKET_JWT_SECRET ?? "";
const INTERNAL_SECRET = process.env.SOCKET_INTERNAL_SECRET ?? "";
const CORS_ORIGINS = (process.env.SOCKET_CORS_ORIGINS ?? "http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** When Next is opened via LAN IP (e.g. http://192.168.x.x:3000), Origin is not localhost — allow private dev hosts unless SOCKET_CORS_STRICT=1. */
function isPermissiveLocalDevOrigin(origin: string | undefined): boolean {
  if (process.env.SOCKET_CORS_STRICT === "1") return false;
  if (process.env.NODE_ENV === "production") return false;
  if (!origin) return true;
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const h = u.hostname;
    if (h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1") return true;
    if (h.endsWith(".localhost")) return true;
    if (h.endsWith(".local")) return true;
    const oct = h.split(".").map((x) => Number.parseInt(x, 10));
    if (oct.length !== 4 || oct.some((n) => Number.isNaN(n))) return false;
    const [a, b] = oct;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  } catch {
    return false;
  }
}

if (!SOCKET_JWT_SECRET || SOCKET_JWT_SECRET.length < 16) {
  console.error("[socket] SOCKET_JWT_SECRET (min 16 chars) is required");
  process.exit(1);
}
if (!INTERNAL_SECRET || INTERNAL_SECRET.length < 16) {
  console.error("[socket] SOCKET_INTERNAL_SECRET (min 16 chars) is required");
  process.exit(1);
}

const prisma = new PrismaClient();

function sessionRoom(sessionId: string) {
  return `session:${sessionId}`;
}

async function assertSessionMember(internalUserId: string, sessionId: string): Promise<boolean> {
  const row = await prisma.session.findFirst({
    where: {
      id: sessionId,
      OR: [{ studentId: internalUserId }, { tutorId: internalUserId }],
    },
    select: { id: true },
  });
  return !!row;
}

let io: Server;

const httpServer = createServer((req, res) => {
  if (req.method === "POST" && req.url === "/internal/publish") {
    const secret = req.headers["x-socket-internal-secret"];
    if (secret !== INTERNAL_SECRET) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
      return;
    }
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        const body = JSON.parse(raw) as InvalidatePublishPayload;
        for (const t of body.targets ?? []) {
          const keys = t.keys ?? [];
          for (const uid of new Set(t.userIds ?? [])) {
            if (!uid) continue;
            io.to(`user:${uid}`).emit(ServerToClientEvents.RT_INVALIDATE, { keys });
          }
        }
        const bKeys = body.broadcastKeys ?? [];
        if (bKeys.length > 0) {
          io.emit(ServerToClientEvents.RT_INVALIDATE, { keys: bKeys });
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false }));
      }
    });
    return;
  }

  if (req.method === "POST" && req.url === "/internal/session-message") {
    const secret = req.headers["x-socket-internal-secret"];
    if (secret !== INTERNAL_SECRET) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
      return;
    }
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        const body = JSON.parse(raw) as MessageNewEventPayload;
        const sid = typeof body?.sessionId === "string" ? body.sessionId : "";
        const msg = body?.message;
        if (!sid || !msg?.id || typeof msg.body !== "string") {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ ok: false }));
          return;
        }
        io.to(sessionRoom(sid)).emit(ServerToClientEvents.MESSAGE_NEW, body);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false }));
      }
    });
    return;
  }

  if (req.method === "POST" && req.url === "/internal/session-started") {
    const secret = req.headers["x-socket-internal-secret"];
    if (secret !== INTERNAL_SECRET) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
      return;
    }
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        const body = JSON.parse(raw) as { sessionId?: string };
        const sid = typeof body?.sessionId === "string" ? body.sessionId : "";
        if (!sid) {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ ok: false }));
          return;
        }
        io.to(sessionRoom(sid)).emit(ServerToClientEvents.SESSION_STARTED, { sessionId: sid });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false }));
      }
    });
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "learnloop-socket" }));
    return;
  }

  res.writeHead(404);
  res.end();
});

io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      if (!origin || CORS_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      if (isPermissiveLocalDevOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`socket cors blocked origin: ${origin}`));
    },
    credentials: true,
  },
  transports: ["websocket"],
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (typeof token !== "string") {
    next(new Error("unauthorized"));
    return;
  }
  const v = verifySocketToken(token, SOCKET_JWT_SECRET);
  if (!v) {
    next(new Error("unauthorized"));
    return;
  }
  socket.data.internalUserId = v.userId;
  next();
});

io.on("connection", (socket) => {
  const uid = socket.data.internalUserId as string;
  void socket.join(`user:${uid}`);

  socket.on(ClientToServerEvents.SESSION_SUBSCRIBE, async (raw: unknown, ack) => {
    const p = raw as SessionSubscribePayload;
    const sessionId = typeof p?.sessionId === "string" ? p.sessionId : "";
    if (!sessionId) {
      ack?.({ ok: false as const });
      return;
    }
    const ok = await assertSessionMember(uid, sessionId);
    if (!ok) {
      ack?.({ ok: false as const });
      return;
    }
    await socket.join(sessionRoom(sessionId));
    ack?.({ ok: true as const });
  });

  socket.on(ClientToServerEvents.SESSION_UNSUBSCRIBE, async (raw: unknown, ack) => {
    const p = raw as SessionSubscribePayload;
    const sessionId = typeof p?.sessionId === "string" ? p.sessionId : "";
    if (sessionId) await socket.leave(sessionRoom(sessionId));
    ack?.({ ok: true as const });
  });

  socket.on(ClientToServerEvents.WB_STROKE, (raw: unknown) => {
    const p = raw as WhiteboardStrokePayload;
    if (!p?.sessionId || !p.stroke?.points?.length) return;
    if (!socket.rooms.has(sessionRoom(p.sessionId))) return;
    socket.to(sessionRoom(p.sessionId)).emit(ServerToClientEvents.WB_STROKE, p);
  });

  socket.on(ClientToServerEvents.WB_CLEAR, (raw: unknown) => {
    const sessionId =
      typeof raw === "object" && raw && "sessionId" in raw ? String((raw as { sessionId: string }).sessionId) : "";
    if (!sessionId || !socket.rooms.has(sessionRoom(sessionId))) return;
    io.to(sessionRoom(sessionId)).emit(ServerToClientEvents.WB_CLEAR, { sessionId });
  });
});

httpServer.listen(PORT, () => {
  console.log(`[socket] listening on ${PORT} (websocket + /internal/publish)`);
});

async function shutdown() {
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
