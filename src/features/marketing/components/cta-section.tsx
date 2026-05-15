"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fadeInUp } from "@/animations/variants";
import { motionSafeViewport } from "@/animations/motion-config";

export function CtaSection() {
  return (
    <section className="py-20 sm:py-28">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={motionSafeViewport}
        variants={fadeInUp}
        className="mx-auto max-w-4xl rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-card to-secondary/10 px-6 py-14 text-center shadow-glow sm:px-10"
      >
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ship the loop your campus deserves.</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Bring LearnLoop to demo day with a shell that already feels funded — then wire your data layer without redesigning the product.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" className="h-11 px-8" asChild>
            <Link href="/sign-up">
              Create account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-11 border-border/80 bg-background/30" asChild>
            <Link href="/dashboard">View dashboard shell</Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
