import type { MessageNewEventPayload } from "@/server/socket/events";

const SOCKET_PUBLISH_TIMEOUT_MS = 1200;

/**
 * Broadcast a persisted session message to everyone in `session:{sessionId}`.
 * Non-blocking — same pattern as `publishQueryInvalidate`.
 */
export async function publishSessionChatMessage(payload: MessageNewEventPayload): Promise<void> {
  const base = process.env.SOCKET_SERVER_INTERNAL_URL?.replace(/\/$/, "");
  const secret = process.env.SOCKET_INTERNAL_SECRET;
  if (!base || !secret) return;

  const url = `${base}/internal/session-message`;
  const body = JSON.stringify(payload);

  void (async () => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), SOCKET_PUBLISH_TIMEOUT_MS);
    try {
      await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-socket-internal-secret": secret,
        },
        body,
        cache: "no-store",
        signal: ac.signal,
      });
    } catch {
      /* ignore */
    } finally {
      clearTimeout(timer);
    }
  })();
}
