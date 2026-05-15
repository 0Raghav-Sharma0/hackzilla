"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { BookOpen, Map, Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AIStreamingText } from "@/features/ai/components/ai-streaming-text";
import { AIShimmer } from "@/features/ai/components/ai-shimmer";
import { AIMatchScoreBar } from "@/features/ai/components/ai-match-score-bar";
import { AISkillRadar } from "@/features/ai/components/ai-skill-radar";

const roadmap = [
  { week: "This week", title: "Lock in fundamentals", detail: "2× micro-sessions on your weakest topic." },
  { week: "Next", title: "Deliberate practice", detail: "Timed drills + tutor feedback loop." },
  { week: "After", title: "Teach-back", detail: "Explain concepts to a peer — XP multiplier." },
];

export function AIInsightsPageClient() {
  const [showShimmer, setShowShimmer] = React.useState(true);
  React.useEffect(() => {
    const t = window.setTimeout(() => setShowShimmer(false), 900);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="mx-auto w-full max-w-full space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">AI co-pilot</h1>
          <Badge variant="secondary" className="gap-1 font-normal">
            <Sparkles className="h-3 w-3 text-primary" />
            Demo preview
          </Badge>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Streaming summaries, match reasoning, and roadmaps — swap the copy layer for your model + SSE when you wire production.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                Learning momentum
              </CardTitle>
              <CardDescription>Velocity from sessions + doubts resolved (mock curve for judges).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showShimmer ? <AIShimmer className="h-32 w-full" /> : null}
              <div className="flex h-32 items-end gap-1">
                {[40, 55, 48, 72, 68, 88, 92].map((h, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-t-md bg-gradient-to-t from-primary/20 to-primary/70"
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.06, type: "spring", stiffness: 200, damping: 22 }}
                  />
                ))}
              </div>
              <AIStreamingText
                speedMs={14}
                text="Your cadence is accelerating: shorter gaps between doubts and higher session completion. Keep pairing with tutors who match your teaching-style vector — that pattern correlates with the biggest gains in the next 7 days."
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
          <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Map className="h-4 w-4 text-primary" />
                Study roadmap
              </CardTitle>
              <CardDescription>AI-generated milestones — deterministic for the demo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {roadmap.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 + i * 0.08 }}
                  className="rounded-lg border border-border/50 bg-muted/20 p-3"
                >
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{step.week}</p>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{step.detail}</p>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Skill compatibility (aggregate)</CardTitle>
          <CardDescription>Radar is presentation-layer intelligence — pairs with tutor cards in-product.</CardDescription>
        </CardHeader>
        <CardContent className="max-w-md">
          <AISkillRadar values={[91, 86, 88, 93, 82]} />
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-primary" />
              Best tutor for you — reasoning
            </CardTitle>
            <CardDescription>Match score + transparent rationale (ties into tutor cards in the request flow).</CardDescription>
          </div>
          <div className="w-full max-w-[200px] sm:w-[200px]">
            <AIMatchScoreBar score={94} />
          </div>
        </CardHeader>
        <CardContent>
          <AIStreamingText
            speedMs={12}
            text="We ranked tutors using subject overlap, median first-response time, review sentiment on explanations (not just stars), and your historical preference for step-by-step derivations. The top pick converges on a teaching style that matches your last three positive sessions."
          />
        </CardContent>
      </Card>
    </div>
  );
}
