"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function DemoFeedOfflineStrip({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-foreground">Demo-safe mode</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The live feed could not load — judges still see the app shell. Retry, or continue from the landing story while the API wakes up.
            </p>
          </div>
        </div>
        <Button type="button" size="sm" variant="outline" className="shrink-0 gap-2 border-amber-500/40" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    </Card>
  );
}
