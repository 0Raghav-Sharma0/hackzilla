import type { SessionStartedPayload } from "@/server/socket/events";

const SOCKET_PUBLISH_TIMEOUT_MS = 1200;

/** Best-effort push so subscribed clients can toast + refetch without waiting on poll. */
export async function publishSessionStarted(payload: SessionStartedPayload): Promise<void> {
  const base = process.env.SOCKET_SERVER_INTERNAL_URL?.replace(/\/$/, "");
  const secret = process.env.SOCKET_INTERNAL_SECRET;
  if (!base || !secret) return;

  const url = `${base}/internal/session-started`;
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
