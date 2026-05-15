"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { fadeInUp, staggerContainer } from "@/animations/variants";
import { motionSafeViewport } from "@/animations/motion-config";

export function AiShowcaseSection() {
  return (
    <section id="ai" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div initial="hidden" whileInView="show" viewport={motionSafeViewport} variants={staggerContainer} className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <motion.div variants={fadeInUp} className="order-2 lg:order-1">
            <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-secondary/10 p-6 shadow-card">
              <p className="font-mono text-xs text-muted-foreground">prompt / v0.4.2 · temperature 0.2</p>
              <p className="mt-4 text-sm leading-relaxed text-foreground">
                Summarize this doubt: “Recursion in C++ — stack vs heap for local arrays?”
              </p>
              <div className="mt-4 space-y-2 border-t border-border/60 pt-4 text-sm text-muted-foreground">
                <p>→ Tags: `recursion`, `memory-model`, `cpp`</p>
                <p>→ Suggested tutors ranked by subject overlap + freshness + rating blend.</p>
                <p>→ Session outline prefilled for tutor (non-binding).</p>
              </div>
            </div>
          </motion.div>
          <motion.div variants={fadeInUp} className="order-1 space-y-4 lg:order-2">
            <Badge variant="secondary">AI showcase</Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Invisible when it should be. Decisive when it counts.</h2>
            <p className="text-lg text-muted-foreground">
              Categorization, embeddings, and reranking stay behind the scenes. The UI shows confidence, not clutter — Vercel-level restraint with GitHub-level utility.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
