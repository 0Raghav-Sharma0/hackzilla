/** Must match `getLeaderboardRows` — seeded `LeaderboardStats.periodKey` uses this key. */
export function getLeaderboardDemoPeriodKey(d = new Date()) {
  return `demo-${d.toISOString().slice(0, 7)}`;
}
