/**
 * Tutor payout for a completed session — scaled by the student’s star rating.
 * Amounts are micro-credits (see `CreditWallet`); display layer may divide for UI.
 */
export const BASE_TUTOR_SESSION_PAYOUT_MICRO = 50_000_000n; // 5★ = full base at 1e7 = “10 credits” scale; tune in product.

/** Flat learner charge on rating submit — independent of tutor’s star-scaled payout (asymmetric economics). */
export const STUDENT_SESSION_FEE_MICRO = 25_000_000n;

export function tutorPayoutMicrocreditsForRating(stars: number): bigint {
  const s = Math.min(5, Math.max(1, Math.round(stars)));
  return (BASE_TUTOR_SESSION_PAYOUT_MICRO * BigInt(s)) / 5n;
}
