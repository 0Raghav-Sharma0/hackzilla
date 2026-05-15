"use client";

import * as React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Filter, Loader2, Plus, Radio, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRequestsFeed } from "@/features/help-requests/actions";
import { useRealtime } from "@/features/realtime/realtime-provider";
import { useAdaptiveRefetchInterval } from "@/features/realtime/use-adaptive-refetch-interval";
import { usePageVisible } from "@/features/realtime/use-page-visible";
import { CreateRequestModal } from "@/features/help-requests/components/create-request-modal";
import { RequestCard, type FeedItem } from "@/features/help-requests/components/request-card";
import { isLearnloopDemo } from "@/lib/demo/demo-flags";
import { DemoFeedOfflineStrip } from "@/features/demo/demo-fallback-ui";
import { ListPageSkeleton } from "@/components/feedback/list-page-skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { cn } from "@/lib/utils";

const REQUESTS_PAGE_UI_KEY = "learnloop-requests-page-ui";

export type RequestsFeedInitialPage = { items: FeedItem[]; nextCursor: string | null };

export function RequestsFeedClient({ initialFeedPage }: { initialFeedPage?: RequestsFeedInitialPage }) {
  const searchParams = useSearchParams();
  const compose = searchParams.get("compose") === "1";
  const [open, setOpen] = React.useState(false);
  const [subject, setSubject] = React.useState<string | undefined>();
  const [q, setQ] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const { subscribe } = useRealtime();

  React.useEffect(() => {
    if (compose) setOpen(true);
  }, [compose]);

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(REQUESTS_PAGE_UI_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { subject?: string; q?: string };
      if (saved.subject !== undefined) setSubject(saved.subject ? saved.subject : undefined);
      if (typeof saved.q === "string") setQ(saved.q);
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    try {
      sessionStorage.setItem(REQUESTS_PAGE_UI_KEY, JSON.stringify({ subject: subject ?? "", q }));
    } catch {
      /* ignore */
    }
  }, [subject, q]);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 320);
    return () => window.clearTimeout(t);
  }, [q]);

  const ssrInfinite = React.useMemo(() => {
    if (!initialFeedPage) return null;
    return {
      pages: [initialFeedPage],
      pageParams: [undefined as string | undefined],
      updatedAt: Date.now(),
    };
  }, [initialFeedPage]);

  const pageVisible = usePageVisible();
  const pollMs = useAdaptiveRefetchInterval(isLearnloopDemo() ? false : 10_000);
  const matchesSsrFilters = subject === undefined && debouncedQ === "";
  const query = useInfiniteQuery({
    queryKey: ["requests-feed", subject, debouncedQ],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) =>
      getRequestsFeed({ cursor: pageParam ?? null, subject, q: debouncedQ || undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: pageVisible ? pollMs : false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: isLearnloopDemo() ? 2 : 1,
    staleTime: 2 * 60_000,
    gcTime: 1000 * 60 * 60 * 12,
    ...(ssrInfinite && matchesSsrFilters
      ? { initialData: { pages: ssrInfinite.pages, pageParams: ssrInfinite.pageParams }, initialDataUpdatedAt: ssrInfinite.updatedAt }
      : {}),
  });

  React.useEffect(() => {
    return subscribe(() => {
      void query.refetch();
    });
  }, [subscribe, query.refetch]);

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const showDemoOffline = query.isError && isLearnloopDemo();
  const showGenericError = query.isError && !isLearnloopDemo();
  const showInitialSkeleton = query.isPending && items.length === 0;
  const feedRefetching = query.isFetching && !query.isFetchingNextPage;

  return (
    <div className="mx-auto w-full max-w-full space-y-6">
      {showDemoOffline ? <DemoFeedOfflineStrip onRetry={() => void query.refetch()} /> : null}

      {showGenericError ? (
        <EmptyState
          icon={AlertCircle}
          title="Feed unavailable"
          description="We couldn’t reach the server. Check your connection and retry — no data was changed locally."
        >
          <Button type="button" variant="glow" onClick={() => void query.refetch()} disabled={query.isFetching}>
            {query.isFetching ? "Retrying…" : "Retry"}
          </Button>
        </EmptyState>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Live doubts</h1>
            <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
              <Radio className="h-3 w-3 animate-pulse" />
              Live
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLearnloopDemo()
              ? "Preview build: light server polling; demo heartbeat keeps the feed fresh without hammering the API."
              : "Live sync across tabs; cross-device presence ships on the socket layer next."}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2 touch-manipulation"
            disabled={showGenericError}
            aria-label="Refresh doubts list"
            onClick={() => void query.refetch()}
          >
            <RefreshCw className={cn("h-4 w-4", feedRefetching && "animate-spin")} aria-hidden />
            Refresh
          </Button>
          <Button variant="glow" className="gap-2 touch-manipulation" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New doubt
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setTyping(true);
              window.setTimeout(() => setTyping(false), 600);
            }}
            placeholder="Search doubts…"
            className="bg-background/50 pr-10"
            aria-label="Search doubts"
          />
          {typing ? (
            <span className="pointer-events-none absolute right-3 top-2.5 text-[10px] text-muted-foreground">Typing…</span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
          <select
            className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background/50 px-2 text-sm sm:w-44"
            value={subject ?? ""}
            onChange={(e) => setSubject(e.target.value || undefined)}
            aria-label="Filter by subject"
          >
            <option value="">All subjects</option>
            <option value="calculus">Calculus</option>
            <option value="linear-algebra">Linear algebra</option>
            <option value="physics">Physics</option>
            <option value="cs-fundamentals">CS</option>
            <option value="statistics">Statistics</option>
            <option value="chemistry">Chemistry</option>
          </select>
        </div>
      </div>

      {showInitialSkeleton && !showDemoOffline && !showGenericError ? <ListPageSkeleton rows={6} /> : null}

      <div className="space-y-3">
        {!showDemoOffline &&
          !showGenericError &&
          items.map((it: FeedItem, i: number) => (
            <RequestCard key={it.id} item={it} index={i} />
          ))}
        {!showDemoOffline && !showGenericError && query.isSuccess && items.length === 0 ? (
          <p className="rounded-xl border border-border/60 bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
            No open doubts match this filter. Clear search or widen the subject — for a packed campus feed, run{" "}
            <span className="font-mono text-foreground">npm run db:seed:demo</span>.
          </p>
        ) : null}
      </div>

      {query.isFetching && !query.isPending && !query.isFetchingNextPage ? (
        <div className="flex justify-center py-6 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          Syncing feed…
        </div>
      ) : null}

      <div className="flex justify-center pb-8">
        <Button
          variant="outline"
          className="touch-manipulation"
          disabled={!query.hasNextPage || query.isFetchingNextPage || showGenericError}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : query.hasNextPage ? "Load more" : "You’re all caught up"}
        </Button>
      </div>

      <CreateRequestModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
