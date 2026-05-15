/** Next.js `revalidateTag` keys — WHY: Coarse-grained cache busting for RSC segments. */
export const cacheTags = {
  user: (id: string) => `user:${id}`,
  request: (id: string) => `request:${id}`,
  session: (id: string) => `session:${id}`,
  leaderboard: (periodKey: string) => `leaderboard:${periodKey}`,
} as const;
