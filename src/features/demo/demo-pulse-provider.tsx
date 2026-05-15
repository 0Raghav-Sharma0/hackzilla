"use client";

import * as React from "react";
import { useRealtime } from "@/features/realtime/realtime-provider";
import { isLearnloopDemo } from "@/lib/demo/demo-flags";

/** Low-frequency synthetic “fanout” so dashboards feel alive without Socket.io (demo only). */
export function DemoPulseProvider({ children }: { children: React.ReactNode }) {
  const { emit } = useRealtime();

  React.useEffect(() => {
    if (!isLearnloopDemo()) return;
    const tick = () => emit({ type: "DEMO_HEARTBEAT" });
    const id = window.setInterval(tick, 8000 + Math.floor(Math.random() * 5000));
    tick();
    return () => window.clearInterval(id);
  }, [emit]);

  return <>{children}</>;
}
