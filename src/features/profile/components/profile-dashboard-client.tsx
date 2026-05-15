"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircle, Award, BookOpen, Sparkles, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfileDashboard } from "@/features/help-requests/actions";
import { InstitutionVerificationCard } from "@/features/trust/components/institution-verification-card";
import { useAdaptiveRefetchInterval } from "@/features/realtime/use-adaptive-refetch-interval";
import { usePageVisible } from "@/features/realtime/use-page-visible";
import { AIMatchScoreBar } from "@/features/ai/components/ai-match-score-bar";
import { EmptyState } from "@/components/feedback/empty-state";

export function ProfileDashboardClient() {
  const pageVisible = usePageVisible();
  const pollMs = useAdaptiveRefetchInterval(30_000);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["profile-dashboard"],
    queryFn: () => getProfileDashboard(),
    refetchInterval: pageVisible ? pollMs : false,
  });

  if (isLoading && !data) {
    return (
      <div className="mx-auto w-full max-w-full space-y-8">
        <div className="h-48 animate-pulse rounded-2xl border border-border/40 bg-muted/20" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-border/40 bg-muted/15" />
          ))}
        </div>
        <div className="h-32 animate-pulse rounded-xl border border-border/40 bg-muted/15" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-full">
        <EmptyState
          icon={AlertCircle}
          title="Profile didn’t load"
          description="We couldn’t fetch your dashboard. Retry — your Clerk session is still active."
        >
          <Button type="button" variant="glow" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? "Retrying…" : "Retry"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard">Home</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (!data) return null;

  const xp = data.stats.sessionsTaught * 120 + data.stats.doubtsPosted * 40 + data.stats.sessionsLearned * 20;
  const xpPct = Math.min(100, Math.round((xp % 500) / 5));

  return (
    <div className="mx-auto w-full max-w-full space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-card">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20 shrink-0 border border-border/60">
            {data.user.avatarUrl ? <AvatarImage src={data.user.avatarUrl} alt="" /> : null}
            <AvatarFallback className="text-lg">{data.user.displayName.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{data.user.displayName}</h1>
            {data.user.headline ? <p className="text-sm text-muted-foreground">{data.user.headline}</p> : null}
            {data.user.campusSlug ? (
              <Badge variant="secondary" className="text-[10px]">
                {data.user.campusSlug}
              </Badge>
            ) : null}
            <div className="max-w-md pt-2">
              <AIMatchScoreBar score={88} />
              <p className="mt-2 text-xs text-muted-foreground">Momentum score blends teaching velocity + learner consistency (demo formula).</p>
            </div>
          </div>
          <div className="relative mx-auto h-28 w-28 shrink-0 sm:mx-0">
            <svg className="-rotate-90" viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" opacity="0.35" />
              <motion.circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - xpPct / 100) }}
                transition={{ type: "spring", stiffness: 80, damping: 18 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">XP</span>
              <span className="font-mono text-xl font-bold text-foreground">{xp}</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Doubts posted", value: data.stats.doubtsPosted, icon: BookOpen },
          { label: "Sessions taught", value: data.stats.sessionsTaught, icon: TrendingUp },
          { label: "Sessions learned", value: data.stats.sessionsLearned, icon: Sparkles },
          { label: "Teaching streak (28d)", value: data.stats.teachingStreakSessions ?? 0, icon: Award },
        ].map((k) => (
          <Card key={k.label} className="border-border/70 bg-card/70 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <k.icon className="h-4 w-4" />
                {k.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <InstitutionVerificationCard
        initialEmail={data.user.institutionVerificationEmail}
        verifiedAt={data.user.institutionVerifiedAt}
      />

      <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            AI strengths snapshot
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {data.aiStrengths.map((s) => (
            <Badge key={s} variant="glow">
              {s}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-amber-400" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.achievements.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/50 bg-muted/10 px-4 py-6 text-center text-muted-foreground">
              No badges yet — post a doubt or complete a session to start your streak.
            </p>
          ) : (
            data.achievements.map((a) => (
              <div key={a.key} className="flex justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
                <span className="min-w-0 truncate">{a.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{new Date(a.earnedAt).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
