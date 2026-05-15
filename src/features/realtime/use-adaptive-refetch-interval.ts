"use client";

import { useSocketIo } from "@/features/realtime/socket-io-provider";

/**
 * When the socket is connected, polling is disabled (`false`); otherwise uses `intervalMs` as a fallback.
 * Pass `false` to disable time-based polling entirely (use invalidation / BroadcastChannel / focus refetch instead).
 */
export function useAdaptiveRefetchInterval(intervalMs: number | false): number | false {
  const { connected } = useSocketIo();
  if (connected || intervalMs === false) return false;
  return intervalMs;
}
