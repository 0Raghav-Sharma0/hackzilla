import { cn } from "@/lib/utils";

export function ListPageSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-[5.5rem] animate-pulse rounded-xl border border-border/40 bg-muted/25"
          style={{ animationDelay: `${i * 40}ms` }}
        />
      ))}
    </div>
  );
}
