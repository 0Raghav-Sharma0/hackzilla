/** Public STUN — TURN must come from `WEBRTC_ICE_SERVERS_JSON` (server) or `NEXT_PUBLIC_WEBRTC_ICE_SERVERS` (client build). */
export const DEFAULT_WEBRTC_STUN: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Parse JSON array of ICE servers from env (server or `NEXT_PUBLIC_*` on client). Invalid entries skipped. */
export function parseIceServersJson(raw: string | undefined): RTCIceServer[] {
  if (!raw?.trim()) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    const out: RTCIceServer[] = [];
    for (const item of v) {
      if (!isRecord(item)) continue;
      const urls = item.urls;
      if (typeof urls === "string" && urls.length > 0) {
        const s: RTCIceServer = { urls };
        if (typeof item.username === "string") s.username = item.username;
        if (typeof item.credential === "string") s.credential = item.credential;
        out.push(s);
        continue;
      }
      if (Array.isArray(urls) && urls.length > 0 && urls.every((u) => typeof u === "string")) {
        const s: RTCIceServer = { urls: urls as string[] };
        if (typeof item.username === "string") s.username = item.username;
        if (typeof item.credential === "string") s.credential = item.credential;
        out.push(s);
      }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Build ICE config for the browser: STUN + server TURN (from token API) + optional client JSON.
 * WHY: Production mobile / symmetric NAT usually fails with STUN-only; TURN credentials belong in server env.
 */
export function buildWebRtcIceServers(opts: { fromTokenApi?: RTCIceServer[] | null; nextPublicJson?: string | undefined }): RTCIceServer[] {
  const fromApi = opts.fromTokenApi?.filter(Boolean) ?? [];
  const merged: RTCIceServer[] = [...DEFAULT_WEBRTC_STUN, ...fromApi, ...parseIceServersJson(opts.nextPublicJson)];
  return merged;
}
