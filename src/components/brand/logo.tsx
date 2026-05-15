import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="relative flex h-8 w-8 items-center justify-center rounded-md border-2 border-border bg-primary/20">
        <span className="h-3 w-3 rounded-sm bg-primary" />
      </span>
      <span className="text-sm sm:text-base">
        Learn<span className="text-muted-foreground">Loop</span>
      </span>
    </Link>
  );
}
