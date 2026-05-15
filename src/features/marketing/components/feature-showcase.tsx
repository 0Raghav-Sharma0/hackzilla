"use client";

import { motion } from "framer-motion";
import { BookOpen, Cpu, Shield, Zap } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fadeInUp, staggerContainer } from "@/animations/variants";
import { motionSafeViewport } from "@/animations/motion-config";

const items = [
  {
    title: "Realtime loop",
    desc: "Interest signals, typing, and presence tuned for low-latency trust — Discord-grade social, Linear-grade focus.",
    icon: Zap,
  },
  {
    title: "Credits that behave",
    desc: "Holds, settlements, and idempotent mutations so money-like flows never double-spend — boring in the best way.",
    icon: Shield,
  },
  {
    title: "AI as copilot",
    desc: "Matching, tagging, and summaries stay explainable. Humans own the session; AI amplifies the edges.",
    icon: Cpu,
  },
  {
    title: "Campus-native",
    desc: "Leaderboards, streaks, and roadmaps that feel earned — Notion clarity with Arc-level delight.",
    icon: BookOpen,
  },
];

export function FeatureShowcase() {
  return (
    <section id="features" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={motionSafeViewport}
          variants={staggerContainer}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.h2 variants={fadeInUp} className="text-display-md font-semibold tracking-tight">
            Built for velocity and taste.
          </motion.h2>
          <motion.p variants={fadeInUp} className="mt-4 text-lg text-muted-foreground">
            Every surface is designed to reward curiosity: fast scans, deep dives, and motion that respects your nervous system.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={motionSafeViewport}
          variants={staggerContainer}
          className="mt-14 grid gap-4 sm:grid-cols-2"
        >
          {items.map(({ title, desc, icon: Icon }) => (
            <motion.div key={title} variants={fadeInUp}>
              <Card className="h-full border-border/70 bg-card/60 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-0.5">
                <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription className="mt-2 text-sm leading-relaxed">{desc}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
