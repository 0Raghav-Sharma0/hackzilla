"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, FileQuestion, Flame, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getRequestDetail } from "@/features/help-requests/actions";
import { useAdaptiveRefetchInterval } from "@/features/realtime/use-adaptive-refetch-interval";
import { usePageVisible } from "@/features/realtime/use-page-visible";
import { ReportContentDialog } from "@/features/trust/components/report-content-dialog";
import { TutorMatchingPanel } from "@/features/tutors/components/tutor-matching-panel";
import { ListPageSkeleton } from "@/components/feedback/list-page-skeleton";
import { EmptyState } from "@/components/feedback/empty-state";

export function RequestDetailClient({ id }: { id: string }) {
  const pageVisible = usePageVisible();
  const pollMs = useAdaptiveRefetchInterval(12_000);
  const { data, isLoading, isError, refetch, isFetching, isSuccess } = useQuery({
    queryKey: ["request-detail", id],
    queryFn: () => getRequestDetail(id),
    refetchInterval: pageVisible ? pollMs : false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 2 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-full space-y-6">
        <div className="h-4 w-32 animate-pulse rounded-md bg-muted/30" />
        <ListPageSkeleton rows={3} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-full">
        <EmptyState
          icon={RefreshCw}
          title="This doubt didn’t load"
          description="The request may have been matched and archived, or the network glitched. Retry or return to the feed."
        >
          <Button type="button" variant="glow" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? "Retrying…" : "Retry"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/requests">Back to feed</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (isSuccess && !data) {
    return (
      <div className="mx-auto w-full max-w-full">
        <EmptyState
          icon={FileQuestion}
          title="Doubt not found"
          description="It may have been matched and removed from the open feed, or the link is outdated."
        >
          <Button variant="glow" asChild>
            <Link href="/dashboard/requests">Browse open doubts</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (!data) return null;

  const urgency =
    data.urgency === "HIGH" ? "text-rose-400 border-rose-500/30 bg-rose-500/10" : data.urgency === "MEDIUM" ? "text-amber-300 border-amber-500/30 bg-amber-500/10" : "text-emerald-300 border-emerald-500/20 bg-emerald-500/10";

  return (
    <div className="mx-auto w-full max-w-full space-y-8">
      <Link
        href="/dashboard/requests"
        className="inline-flex items-center gap-2 rounded-lg text-sm text-muted-foreground outline-none ring-offset-background transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        Back to live feed
      </Link>

      <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{data.subjectSlug.replace(/-/g, " ")}</Badge>
          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase ${urgency}`}>
            <Flame className="mr-1 inline h-3 w-3" aria-hidden />
            {data.urgency}
          </span>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {data.interestCount} interested
          </Badge>
          <ReportContentDialog target={{ targetType: "HELP_REQUEST", targetId: id }} />
        </div>
        <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{data.title}</h1>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground sm:text-base">{data.fullBody}</p>
        <div className="flex flex-wrap gap-2">
          {data.tags.map((t) => (
            <Badge key={t.tag} variant="glow" className="font-normal">
              {t.tag} · {Math.round(t.confidence * 100)}%
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          by {data.author.displayName} · {data.preferredDurationMinutes} min · {data.language}
        </p>
      </motion.article>

      <Separator />

      <TutorMatchingPanel requestId={id} subjectSlug={data.subjectSlug} />
    </div>
  );
}
