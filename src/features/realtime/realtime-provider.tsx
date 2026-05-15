"use client";

import * as React from "react";

export type RealtimePayload =
  | { type: "REQUEST_CREATED" | "REQUEST_INTEREST" | "REQUEST_UPDATED"; requestId?: string }
  | { type: "DEMO_HEARTBEAT" };

type Listener = (p: RealtimePayload) => void;

const RealtimeContext = React.createContext<{
  emit: (p: RealtimePayload) => void;
  subscribe: (fn: Listener) => () => void;
} | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const listeners = React.useRef(new Set<Listener>());
  const bcRef = React.useRef<BroadcastChannel | null>(null);

  React.useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel("learnloop-rt-v1");
    bcRef.current = bc;
    bc.onmessage = (ev: MessageEvent<RealtimePayload>) => {
      listeners.current.forEach((l) => l(ev.data));
    };
    return () => bc.close();
  }, []);

  const emit = React.useCallback((p: RealtimePayload) => {
    listeners.current.forEach((l) => l(p));
    try {
      bcRef.current?.postMessage(p);
    } catch {
      /* ignore */
    }
  }, []);

  const subscribe = React.useCallback((fn: Listener) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  const value = React.useMemo(() => ({ emit, subscribe }), [emit, subscribe]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  const ctx = React.useContext(RealtimeContext);
  if (!ctx) throw new Error("RealtimeProvider missing");
  return ctx;
}
