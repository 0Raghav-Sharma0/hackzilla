"use client";

import * as React from "react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RealtimeProvider } from "@/features/realtime/realtime-provider";
import { SocketIoProvider } from "@/features/realtime/socket-io-provider";
import { DemoPulseProvider } from "@/features/demo/demo-pulse-provider";
import { Toaster } from "sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <SocketIoProvider>
          <RealtimeProvider>
            <DemoPulseProvider>
            <TooltipProvider delayDuration={200}>
              {children}
              <Toaster richColors closeButton position="top-center" />
            </TooltipProvider>
            </DemoPulseProvider>
          </RealtimeProvider>
        </SocketIoProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
