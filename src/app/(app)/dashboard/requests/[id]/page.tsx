import { Suspense } from "react";
import { RequestDetailClient } from "@/features/help-requests/components/request-detail-client";

function DetailFallback() {
  return (
    <div className="mx-auto w-full max-w-full space-y-6 py-8">
      <div className="h-9 w-2/3 animate-pulse rounded-md bg-muted" />
      <div className="h-40 animate-pulse rounded-xl border border-border/40 bg-muted/30" />
    </div>
  );
}

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<DetailFallback />}>
      <RequestDetailClient id={id} />
    </Suspense>
  );
}
