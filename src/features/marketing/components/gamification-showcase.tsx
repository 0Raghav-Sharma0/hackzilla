"use client";

import { motion } from "framer-motion";
import { Flame, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fadeInUp, staggerContainer } from "@/animations/variants";
import { motionSafeViewport } from "@/animations/motion-config";

export function GamificationShowcase() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div initial="hidden" whileInView="show" viewport={motionSafeViewport} variants={staggerContainer} className="flex flex-col items-center text-center">
          <motion.div variants={fadeInUp}>
            <Badge variant="outline" className="gap-1">
              <Trophy className="h-3 w-3" />
              Streaks · badges · campus boards
            </Badge>
          </motion.div>
          <motion.h2 variants={fadeInUp} className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Progress you can feel — without cheap dopamine tricks.
          </motion.h2>
          <motion.p variants={fadeInUp} className="mt-3 max-w-xl text-muted-foreground">
            Micro-celebrations on real milestones: first session, five-star streak, helpfulness velocity. Motion is short, crisp, and optional under reduced motion.
          </motion.p>
          <motion.div variants={fadeInUp} className="mt-8 flex items-center gap-3 rounded-full border border-border/60 bg-card/60 px-5 py-2 font-mono text-sm backdrop-blur-sm">
            <Flame className="h-4 w-4 text-orange-400" />
            <span className="text-muted-foreground">Teaching streak</span>
            <span className="tabular-nums text-foreground">12 days</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
