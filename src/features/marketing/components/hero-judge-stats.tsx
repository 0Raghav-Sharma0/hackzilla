"use client";

import { motion } from "framer-motion";
import { TrendingUp, Users, Zap } from "lucide-react";
import { AnimatedCounter } from "@/components/micro/animated-counter";

/** Judge-facing headline stats — integers spring; rating stays crisp. */
export function HeroJudgeStats() {
  const items = [
    { label: "Students helped today", kind: "int" as const, value: 847, icon: Users },
    { label: "Sessions forming", kind: "int" as const, value: 128, icon: Zap },
    { label: "Avg session rating", kind: "text" as const, text: "4.8★", icon: TrendingUp },
  ];

  return (
    <div className="mt-6 grid grid-cols-3 gap-3 text-left sm:gap-6">
      {items.map((k) => (
        <motion.div
          key={k.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="rounded-xl border border-border/50 bg-background/40 px-3 py-3 backdrop-blur-sm sm:px-4"
        >
          <k.icon className="mb-2 h-4 w-4 text-primary" />
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[11px]">{k.label}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
            {k.kind === "int" ? <AnimatedCounter value={k.value} /> : k.text}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
