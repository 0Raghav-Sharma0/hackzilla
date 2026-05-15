"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Crown, Flame, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLeaderboardRows } from "@/features/help-requests/actions";
import { useAdaptiveRefetchInterval } from "@/features/realtime/use-adaptive-refetch-interval";
import { usePageVisible } from "@/features/realtime/use-page-visible";
import { AnimatedCounter } from "@/components/micro/animated-counter";
import { EmptyState } from "@/components/feedback/empty-state";
import { springSnappy } from "@/animations/variants";

export function LeaderboardClient() {
  const pageVisible = usePageVisible();
  const pollMs = useAdaptiveRefetchInterval(20_000);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => getLeaderboardRows(),
    refetchInterval: pageVisible ? pollMs : false,
  });

  if (isLoading && !data) {
    return (
      <div className="mx-auto w-full max-w-full space-y-8">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted/40" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-muted/30" />
        </div>
        <div className="flex justify-center gap-4 pb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex w-28 flex-col items-center">
              <div className="mb-2 h-20 w-full animate-pulse rounded-2xl bg-muted/30" />
              <div className="h-36 w-full animate-pulse rounded-t-xl bg-muted/20" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/20" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-full">
        <EmptyState
          icon={RefreshCw}
          title="Leaderboard unavailable"
          description="We couldn’t reach the ranking service. Your account is fine — retry in a moment."
        >
          <Button type="button" variant="glow" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? "Retrying…" : "Retry"}
          </Button>
        </EmptyState>
      </div>
    );
  }

  const rows = data ?? [];
  const [first, second, third, ...rest] = rows;

  return (
    <div className="mx-auto w-full max-w-full space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-foreground/72">
          Podium glow + monthly points — seeded demo fills this automatically.
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-center gap-3 pb-4 sm:gap-4">
        {[second, first, third].filter(Boolean).map((row, idx) => {
          if (!row) return null;
          const order = idx === 0 ? "order-1" : idx === 1 ? "order-2 z-10 sm:scale-105" : "order-3";
          const h = idx === 1 ? "h-44" : "h-32";
          const glow =
            row.tier === "gold"
              ? "border-primary/30 bg-gradient-to-b from-primary/18 via-amber-400/20 to-card shadow-md ring-1 ring-primary/15"
              : row.tier === "silver"
                ? "border-border/80 bg-gradient-to-b from-slate-300/25 to-card shadow-md"
                : "border-primary/20 bg-gradient-to-b from-primary/14 to-card shadow-md";
          return (
            <motion.div
              key={row.userId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springSnappy, delay: Math.min(idx * 0.06, 0.2) }}
              className={`flex w-[min(28vw,7.5rem)] max-w-[7.5rem] flex-col items-center sm:w-28 ${order}`}
            >
              <div className={`relative mb-2 w-full rounded-2xl border p-2.5 sm:p-3 ${glow}`}>
                {idx === 1 ? <Crown className="absolute -top-3 left-1/2 h-6 w-6 -translate-x-1/2 text-amber-400" aria-hidden /> : null}
                <Avatar className="mx-auto h-12 w-12 border border-border/60 sm:h-14 sm:w-14">
                  <AvatarFallback>{row.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
              </div>
              <div
                className={`w-full rounded-t-xl border-2 border-border/70 bg-card ${h} flex flex-col items-center justify-end pb-3 text-center shadow-sm`}
              >
                <p className="line-clamp-2 px-1 text-[11px] font-semibold leading-tight sm:text-xs">{row.name}</p>
                <p className="mt-1 font-mono text-base font-bold tabular-nums text-primary sm:text-lg">
                  <AnimatedCounter value={row.points} />
                </p>
                <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Flame className="h-3 w-3 text-orange-400" aria-hidden />
                  {row.streak}d
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="space-y-2">
        {rest.map((row, i) => (
          <motion.div
            key={row.userId}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(0.12 + i * 0.025, 0.35) }}
            className="flex items-center justify-between gap-3 rounded-xl border-2 border-border/70 bg-card px-3 py-3 shadow-sm sm:px-4"
          >
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <span className="w-5 shrink-0 font-mono text-xs text-muted-foreground sm:w-6 sm:text-sm">{row.rank}</span>
              <Avatar className="h-8 w-8 shrink-0 sm:h-9 sm:w-9">
                <AvatarFallback>{row.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <span className="truncate font-medium">{row.name}</span>
              <Badge variant="outline" className="hidden shrink-0 text-[10px] sm:inline-flex">
                {row.tier}
              </Badge>
            </div>
            <span className="shrink-0 font-mono text-sm text-primary">
              <AnimatedCounter value={row.points} />
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
