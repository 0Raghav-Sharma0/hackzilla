"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function AIMatchScoreBar({ score, className }: { score: number; className?: string }) {
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1 text-primary">
          <Sparkles className="h-3 w-3" />
          AI match
        </span>
        <span className="font-mono tabular-nums text-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary/70 via-secondary/80 to-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 24 }}
        />
      </div>
    </div>
  );
}
