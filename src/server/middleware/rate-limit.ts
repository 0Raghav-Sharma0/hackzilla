/**
 * In-memory rate limiter — WHY: Dev + low-traffic MVP; swap for Upstash in production.
 */
import { AppError } from "@/lib/errors/app-error";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimitOrThrow(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (bucket.count >= limit) {
    throw AppError.rateLimited();
  }
  bucket.count += 1;
}
