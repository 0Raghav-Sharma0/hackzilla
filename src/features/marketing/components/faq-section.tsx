"use client";

import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/animations/variants";
import { motionSafeViewport } from "@/animations/motion-config";

const faqs = [
  { q: "Is this only for CS?", a: "No — taxonomy starts STEM-heavy but generalizes to any subject with structured tags." },
  { q: "How do credits work?", a: "Earn by teaching, spend by learning. Ledgered, idempotent, and built for audits." },
  { q: "Does AI replace tutors?", a: "Never in-session authority. AI routes, summarizes, and nudges — humans teach." },
];

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <motion.h2
          initial="hidden"
          whileInView="show"
          viewport={motionSafeViewport}
          variants={fadeInUp}
          className="text-center text-3xl font-semibold tracking-tight"
        >
          FAQ
        </motion.h2>
        <motion.div initial="hidden" whileInView="show" viewport={motionSafeViewport} variants={staggerContainer} className="mt-10 space-y-4">
          {faqs.map((f) => (
            <motion.div key={f.q} variants={fadeInUp} className="rounded-xl border border-border/60 bg-card/50 p-5 backdrop-blur-sm">
              <p className="font-medium">{f.q}</p>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
