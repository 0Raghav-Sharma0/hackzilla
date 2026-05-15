/**
 * Push React Query invalidation hints to the socket server — WHY: avoids hammering Next with poll loops.
 * When `SOCKET_SERVER_INTERNAL_URL` / `SOCKET_INTERNAL_SECRET` are unset, this is a no-op (HTTP polling fallback).
 *
 * IMPORTANT: Never block server actions on this network call — a down/slow socket tier must not stall UX.
 */

export type InvalidateQueryKey = (string | number | boolean | null)[];

export type InvalidatePublishPayload = {
  targets?: { userIds: string[]; keys: InvalidateQueryKey[] }[];
  broadcastKeys?: InvalidateQueryKey[];
};

const SOCKET_PUBLISH_TIMEOUT_MS = 1200;

/**
 * Schedules a best-effort POST to the socket server and returns immediately.
 * Callers may `await` this — it still resolves in the same tick (work runs in the background).
 */
export async function publishQueryInvalidate(payload: InvalidatePublishPayload): Promise<void> {
  const base = process.env.SOCKET_SERVER_INTERNAL_URL?.replace(/\/$/, "");
  const secret = process.env.SOCKET_INTERNAL_SECRET;
  if (!base || !secret) return;
  const hasWork =
    (payload.targets?.length ?? 0) > 0 || (payload.broadcastKeys?.length ?? 0) > 0;
  if (!hasWork) return;

  const url = `${base}/internal/publish`;
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
      /* non-fatal: polling still works */
    } finally {
      clearTimeout(timer);
    }
  })();
}
