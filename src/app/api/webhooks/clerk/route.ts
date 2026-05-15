import { headers } from "next/headers";
import { Webhook } from "svix";
import { NextResponse } from "next/server";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { upsertUserFromClerkSync } from "@/lib/auth/sync-clerk-user";

/**
 * Clerk user sync — WHY: Internal `User` row must exist before any `/api/v1/*` business logic runs.
 * Svix signature verification prevents spoofed provisioning events.
 */
export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    logger.error("webhook.clerk.missing_secret");
    return NextResponse.json({ ok: false, error: "Misconfigured server" }, { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ ok: false, error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;
  try {
    evt = wh.verify(body, { "svix-id": svixId, "svix-timestamp": svixTimestamp, "svix-signature": svixSignature }) as WebhookEvent;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }

  const eventType = evt.type;

  try {
    if (eventType === "user.created" || eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      const primary = email_addresses?.[0]?.email_address ?? null;
      await upsertUserFromClerkSync({
        id,
        primaryEmail: primary,
        firstName: first_name ?? null,
        lastName: last_name ?? null,
        imageUrl: image_url ?? null,
      });
    }

    if (eventType === "user.deleted") {
      const id = evt.data.id;
      await prisma.user.updateMany({
        where: { clerkUserId: id },
        data: { deletedAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("webhook.clerk.handler_failed", { eventType, err: String(err) });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
