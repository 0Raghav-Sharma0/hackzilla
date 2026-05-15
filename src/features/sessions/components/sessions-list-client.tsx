"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Video, AlertCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getMySessions } from "@/features/help-requests/actions";
import { useAdaptiveRefetchInterval } from "@/features/realtime/use-adaptive-refetch-interval";
import { usePageVisible } from "@/features/realtime/use-page-visible";
import { EmptyState } from "@/components/feedback/empty-state";
import { ListPageSkeleton } from "@/components/feedback/list-page-skeleton";
import { springSnappy } from "@/animations/variants";
import { cn } from "@/lib/utils";

export type MySessionListItem = Awaited<ReturnType<typeof getMySessions>>[number];

export function SessionsListClient({ initialSessions }: { initialSessions?: MySessionListItem[] }) {
  const pageVisible = usePageVisible();
  const pollMs = useAdaptiveRefetchInterval(25_000);
  const initialMeta = React.useMemo(() => {
    if (!initialSessions) return null;
    return { data: initialSessions, updatedAt: Date.now() };
  }, [initialSessions]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["my-sessions"],
    queryFn: () => getMySessions(),
    refetchInterval: pageVisible ? pollMs : false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 2 * 60_000,
    gcTime: 1000 * 60 * 60 * 12,
    ...(initialMeta
      ? { initialData: initialMeta.data, initialDataUpdatedAt: initialMeta.updatedAt }
      : {}),
  });

  if (isLoading && !data) {
    return (
      <div className="mx-auto w-full max-w-full space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-40 animate-pulse rounded-md bg-muted/40" />
          <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-muted/30" />
        </div>
        <ListPageSkeleton rows={5} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-full">
        <EmptyState
          icon={AlertCircle}
          title="Couldn’t load sessions"
          description="The list failed to refresh. Check your connection and try again — nothing was deleted."
        >
          <Button type="button" variant="glow" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? "Retrying…" : "Retry"}
          </Button>
        </EmptyState>
      </div>
    );
  }

  const sessions = data ?? [];

  return (
    <div className="mx-auto w-full max-w-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
          <p className="mt-1 text-sm text-muted-foreground">Jump back into live rooms — status syncs every few seconds.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 gap-2 touch-manipulation self-start sm:self-auto"
          aria-label="Refresh sessions list"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} aria-hidden />
          Refresh
        </Button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No sessions yet"
          description="When you match on a doubt, the session appears here with one-tap re-entry. Post a doubt from the feed to start the loop."
        >
          <Button variant="glow" asChild>
            <Link href="/dashboard/requests?compose=1">Open live feed</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/requests">Browse doubts</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {sessions.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springSnappy, delay: Math.min(i * 0.03, 0.18) }}
            >
              <Card className="flex flex-col gap-4 border-border/70 bg-card/70 p-4 shadow-card backdrop-blur-sm transition-shadow hover:shadow-card-hover sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{s.subjectSlug.replace(/-/g, " ")}</p>
                  <p className="mt-0.5 font-medium leading-snug">{s.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.role === "student" ? "Learning with" : "Teaching"} {s.peerName} · {s.status}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary">{s.role}</Badge>
                  <Button size="sm" variant="glow" asChild className="touch-manipulation">
                    <Link href={`/dashboard/sessions/${s.id}`}>
                      Open
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
