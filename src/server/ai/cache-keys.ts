import { createHash } from "crypto";

/**
 * Deterministic cache key for AI responses — WHY: dedupe identical prompts across users/sessions.
 */
export function aiInputHash(parts: unknown[]): string {
  const h = createHash("sha256");
  for (const p of parts) {
    h.update(typeof p === "string" ? p : JSON.stringify(p));
  }
  return h.digest("hex");
}
