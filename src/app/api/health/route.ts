import { NextResponse } from "next/server";

/** Liveness — WHY: No secrets import; safe for orchestrators and Clerk middleware allowlist. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "learnloop", ts: new Date().toISOString() });
}
