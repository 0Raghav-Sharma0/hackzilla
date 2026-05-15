import { Suspense } from "react";
import { RequestsFeedClient } from "@/features/help-requests/components/requests-feed-client";

function FeedFallback() {
  return (
    <div className="mx-auto w-full max-w-full space-y-6 py-8">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-border/40 bg-muted/30" />
        ))}
      </div>
    </div>
  );
}

/** Client-only feed fetch — avoids blocking navigation on a second server round-trip to Postgres. */
export default function RequestsPage() {
  return (
    <Suspense fallback={<FeedFallback />}>
      <RequestsFeedClient />
    </Suspense>
  );
}
