"use client";

import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function AIReasoningChain({
  steps,
  className,
  thinking,
}: {
  steps: string[];
  className?: string;
  thinking?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border border-border/50 bg-muted/15 p-3", className)}>
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        AI reasoning trace
      </div>
      <ul className="space-y-2">
        {steps.map((s, i) => (
          <motion.li
            key={`${i}-${s.slice(0, 24)}`}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 * i, type: "spring", stiffness: 300, damping: 26 }}
            className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
          >
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Check className="h-2.5 w-2.5" />
            </span>
            <span>{s}</span>
          </motion.li>
        ))}
      </ul>
      {thinking ? (
        <motion.div
          className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="font-medium text-primary">Re-ranking</span>
          <span className="inline-flex gap-0.5">
            {[0, 1, 2].map((d) => (
              <motion.span
                key={d}
                className="h-1 w-1 rounded-full bg-primary"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: d * 0.15 }}
              />
            ))}
          </span>
        </motion.div>
      ) : null}
    </div>
  );
}
