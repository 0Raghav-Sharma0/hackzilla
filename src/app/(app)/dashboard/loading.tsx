/**
 * Instant shell while a dashboard segment RSC loads — makes client navigations feel closer to a Vite SPA.
 */
export default function DashboardLoading() {
  return (
    <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 py-16" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      <p className="text-xs text-muted-foreground">Loading…</p>
    </div>
  );
}
