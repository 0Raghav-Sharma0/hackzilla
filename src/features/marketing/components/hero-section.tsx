"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fadeInUp, staggerContainer } from "@/animations/variants";
import { motionSafeViewport } from "@/animations/motion-config";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { HeroJudgeStats } from "@/features/marketing/components/hero-judge-stats";
import { LiveActivityTicker } from "@/features/marketing/components/live-activity-ticker";

export function HeroSection() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 80]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-background pt-10 pb-20 sm:pt-16 sm:pb-28">
      <motion.div style={{ y }} className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mx-auto max-w-3xl text-center">
          <motion.div variants={fadeInUp}>
            <Badge variant="glow" className="mb-6 px-3 py-1">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Knowledge credits · Live sessions · AI matching
            </Badge>
          </motion.div>
          <motion.h1 variants={fadeInUp} className="text-balance text-display-md sm:text-display-lg font-semibold tracking-tight text-foreground">
            The peer learning loop that never sleeps.
          </motion.h1>
          <motion.p variants={fadeInUp} className="mt-5 text-balance text-lg text-muted-foreground sm:text-xl">
            Post a doubt. Matched tutors arrive in real time. Credits flow fairly. AI keeps everyone a step ahead — without stealing the spotlight from humans.
          </motion.p>
          <motion.div variants={fadeInUp} className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="h-11 px-8 shadow-glow" asChild>
              <Link href="/sign-up">
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-11 border-border/80 bg-background/40 backdrop-blur-sm" asChild>
              <Link href="#features">See how it works</Link>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={motionSafeViewport}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-16 max-w-4xl space-y-4"
        >
          <LiveActivityTicker />
          <div className="gradient-border relative overflow-hidden rounded-2xl p-[1px]">
            <div className="relative rounded-2xl border border-border/50 bg-card/80 p-1 shadow-card backdrop-blur-xl">
              <div className="rounded-xl bg-gradient-to-b from-muted/40 to-background/20 p-4 sm:p-6">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-primary">Platform pulse</p>
                  <p className="text-sm text-muted-foreground">
                    Sessions forming · tutors matching · credits moving. Seed the demo ecosystem so the in-app feed mirrors this same density.
                  </p>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary/80 to-secondary/90"
                    initial={{ width: "12%" }}
                    animate={{ width: ["12%", "78%", "45%", "68%"] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
                <HeroJudgeStats />
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
