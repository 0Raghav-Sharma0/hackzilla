import { z } from "zod";
import { createApiHandler } from "@/lib/api/handler";
import { getServerEnv } from "@/lib/env/server";
import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/db/prisma";
import { createSocketToken } from "@/lib/realtime/socket-token";
import { parseIceServersJson } from "@/lib/realtime/webrtc-ice-config";

const bodySchema = z.object({});

/**
 * Issues a short-lived HMAC token for Socket.io handshake — WHY: Stateless verification on socket tier.
 * Format: `${internalUserId}.${expUnix}.${hexHmac}` where HMAC-SHA256(secret, `${userId}.${exp}`).
 * Replace with `jose` + asymmetric keys when rotating secrets across regions.
 */
export const POST = createApiHandler({
  requireAuth: true,
  bodySchema,
  handler: async (ctx) => {
    const env = getServerEnv();
    if (!env.SOCKET_JWT_SECRET || !env.SOCKET_SERVER_URL) {
      throw AppError.serviceUnavailable("Realtime is not configured");
    }

    const clerkUserId = ctx.clerkUserId;
    if (!clerkUserId) throw AppError.unauthorized();

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true, deletedAt: true },
    });
    if (!user || user.deletedAt) throw AppError.notFound("User not found");

    const { token, expiresAtUnix } = createSocketToken(user.id, env.SOCKET_JWT_SECRET, 5 * 60);

    const iceServersFromSecret = parseIceServersJson(env.WEBRTC_ICE_SERVERS_JSON);

    return {
      token,
      expiresAt: new Date(expiresAtUnix * 1000).toISOString(),
      socketUrl: env.SOCKET_SERVER_URL,
      /** TURN (and optional extra STUN) from server env — browser merges with defaults + NEXT_PUBLIC_WEBRTC_ICE_SERVERS. */
      iceServers: iceServersFromSecret,
    };
  },
});
