import { Suspense } from "react";
import { SessionRoomClient } from "@/features/sessions/components/session-room-client";
import { AIShimmer } from "@/features/ai/components/ai-shimmer";

function SessionRoomFallback() {
  return (
    <div className="mx-auto w-full max-w-full space-y-4 px-1 sm:px-0">
      <AIShimmer className="h-36 w-full rounded-2xl sm:h-40" />
      <AIShimmer className="h-72 w-full rounded-2xl sm:h-64" />
    </div>
  );
}

/** Room data loads in the client via React Query — route shell returns without waiting on Neon. */
export default async function SessionRoomPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return (
    <Suspense fallback={<SessionRoomFallback />}>
      <SessionRoomClient sessionId={sessionId} />
    </Suspense>
  );
}
