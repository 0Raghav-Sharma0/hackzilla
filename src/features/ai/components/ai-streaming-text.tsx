"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Lightweight “streaming” reveal for demo — swap for SSE / AI SDK stream later. */
export function AIStreamingText({ text, className, speedMs = 18 }: { text: string; className?: string; speedMs?: number }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    setI(0);
    const id = window.setInterval(() => {
      setI((v) => {
        if (v >= text.length) {
          window.clearInterval(id);
          return v;
        }
        return v + 1;
      });
    }, speedMs);
    return () => window.clearInterval(id);
  }, [text, speedMs]);

  return (
    <motion.p className={cn("whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground", className)} layout>
      {text.slice(0, i)}
      <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-primary/80" aria-hidden />
    </motion.p>
  );
}
