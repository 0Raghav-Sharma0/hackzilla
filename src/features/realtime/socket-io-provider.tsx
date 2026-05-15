"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { ServerToClientEvents } from "@/server/socket/events";

type SocketIoContextValue = {
  connected: boolean;
  socket: Socket | null;
};

const SocketIoContext = React.createContext<SocketIoContextValue | null>(null);

export function SocketIoProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [connected, setConnected] = React.useState(false);
  const [socket, setSocket] = React.useState<Socket | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let s: Socket | null = null;

    async function connect() {
      const res = await fetch("/api/v1/realtime/token", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const json = (await res.json()) as { ok?: boolean; data?: { token: string; socketUrl: string } };
      if (cancelled || !json.ok || !json.data?.token || !json.data.socketUrl) return;

      s = io(json.data.socketUrl, {
        transports: ["websocket"],
        auth: { token: json.data.token },
        reconnection: true,
        reconnectionAttempts: 12,
        reconnectionDelay: 1500,
      });

      s.on("connect", () => setConnected(true));
      s.on("disconnect", () => setConnected(false));
      s.on("connect_error", (err) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("[socket] connect_error:", err.message);
        }
      });

      s.on(ServerToClientEvents.RT_INVALIDATE, (payload: { keys?: (string | number)[][] }) => {
        for (const key of payload.keys ?? []) {
          void qc.invalidateQueries({ queryKey: key });
        }
      });

      setSocket(s);
    }

    void connect();

    return () => {
      cancelled = true;
      if (s) {
        s.removeAllListeners();
        s.disconnect();
      }
      setSocket(null);
      setConnected(false);
    };
  }, [qc]);

  const value = React.useMemo(() => ({ connected, socket }), [connected, socket]);

  return <SocketIoContext.Provider value={value}>{children}</SocketIoContext.Provider>;
}

export function useSocketIo(): SocketIoContextValue {
  const ctx = React.useContext(SocketIoContext);
  if (!ctx) throw new Error("SocketIoProvider missing");
  return ctx;
}
