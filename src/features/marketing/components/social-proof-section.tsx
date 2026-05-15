"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { fadeInUp, staggerContainer } from "@/animations/variants";
import { motionSafeViewport } from "@/animations/motion-config";

const quotes = [
  { initials: "AR", name: "Avery Reyes", campus: "Riverside Tech", quote: "It feels like the product team actually lives in lecture halls — the matching panel is absurdly fast." },
  { initials: "JM", name: "Jordan Malik", campus: "Harbor Poly", quote: "Credits that respect both sides? Rare. I teach two micro-sessions a week and it never feels extractive." },
  { initials: "SK", name: "Sam Okonkwo", campus: "Summit State", quote: "The AI doesn’t lecture you — it routes you to a human who fits how you think. That’s the right hierarchy." },
  { initials: "PL", name: "Priya Liu", campus: "Northline U", quote: "Session recaps are good enough to pin in Notion. My study group asks which tool we switched to." },
  { initials: "RC", name: "Riley Chen", campus: "Cascade College", quote: "Campus leaderboard is dangerously addictive. We’re all grinding for the podium now." },
];

export function SocialProofSection() {
  const [qi, setQi] = React.useState(0);
  React.useEffect(() => {
    const id = window.setInterval(() => setQi((v) => (v + 1) % quotes.length), 5200);
    return () => window.clearInterval(id);
  }, []);
  const q = quotes[qi]!;

  return (
    <section className="border-y border-border/60 bg-muted/20 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={motionSafeViewport}
          variants={staggerContainer}
          className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center"
        >
          <motion.div variants={fadeInUp}>
            <p className="text-sm font-medium uppercase tracking-wider text-primary">Social proof</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Built for campuses that move fast.</h2>
            <p className="mt-4 text-muted-foreground">
              Rotating voices — demo-safe storytelling. Swap in your pilot school quotes when you have them; until then, this reads like a lived-in network.
            </p>
          </motion.div>
          <div className="relative min-h-[160px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={q.name}
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="flex gap-4 rounded-xl border border-border/60 bg-card/70 p-5 shadow-card backdrop-blur-sm"
              >
                <Avatar className="h-12 w-12 border border-border/50">
                  <AvatarFallback className="bg-gradient-to-br from-primary/25 to-secondary/30 text-sm font-semibold">{q.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{q.name}</p>
                  <p className="text-[11px] text-muted-foreground">{q.campus}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{`"${q.quote}"`}</p>
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="mt-4 flex gap-1.5">
              {quotes.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Show testimonial ${i + 1}`}
                  onClick={() => setQi(i)}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${i === qi ? "bg-primary" : "bg-muted-foreground/25 hover:bg-muted-foreground/45"}`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
