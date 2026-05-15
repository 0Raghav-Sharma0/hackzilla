import { createHmac, timingSafeEqual } from "node:crypto";

/** HMAC token: `${internalUserId}.${expUnix}.${hexSig}` — verified on the socket tier. */
export function createSocketToken(
  internalUserId: string,
  secret: string,
  ttlSec = 300,
): { token: string; expiresAtUnix: number } {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `${internalUserId}.${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return { token: `${payload}.${sig}`, expiresAtUnix: exp };
}

export function verifySocketToken(token: string, secret: string): { userId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts;
  if (!userId || !expStr || !sig) return null;
  const payload = `${userId}.${expStr}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  try {
    if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(sig, "utf8"))) {
      return null;
    }
  } catch {
    return null;
  }
  const exp = Number.parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  return { userId };
}
