"use client";

import { motion } from "framer-motion";
import { Flame, MessageCircle, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AIMatchScoreBar } from "@/features/ai/components/ai-match-score-bar";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { DemoTutor } from "@/features/tutors/demo-tutors";

export function TutorCard({
  tutor,
  reason,
  selected,
  onSelect,
  layoutId,
}: {
  tutor: DemoTutor;
  reason: string;
  selected?: boolean;
  onSelect?: () => void;
  layoutId?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      layoutId={layoutId}
      whileHover={reduceMotion ? undefined : { y: -3 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
    >
      <Card
        role={onSelect ? "button" : undefined}
        tabIndex={onSelect ? 0 : undefined}
        onClick={onSelect}
        onKeyDown={(e) => e.key === "Enter" && onSelect?.()}
        className={cn(
          "relative cursor-pointer overflow-hidden border-border/70 bg-card/70 p-4 shadow-card backdrop-blur-sm transition-shadow",
          selected && "ring-2 ring-primary/60 shadow-glow",
        )}
      >
        {tutor.online ? (
          <span className="absolute right-4 top-4 flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Live
          </span>
        ) : (
          <span className="absolute right-4 top-4 text-[11px] text-muted-foreground">Away</span>
        )}
        <div className="flex gap-3">
          <Avatar className="h-12 w-12 border border-border/60">
            <AvatarFallback className="bg-gradient-to-br from-primary/30 to-secondary/40 text-sm font-semibold">
              {tutor.name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="truncate font-semibold leading-tight">{tutor.name}</p>
              <p className="truncate text-xs text-muted-foreground">{tutor.headline}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {tutor.subjects.map((s) => (
                <Badge key={s} variant="secondary" className="text-[10px] font-normal">
                  {s}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1 font-medium text-foreground">
                ★ {tutor.rating.toFixed(2)}
              </span>
              <span className="flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                {tutor.streak}d
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                ~{tutor.responseMin}m
              </span>
            </div>
            <AIMatchScoreBar score={tutor.matchScore} />
            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{reason}</span>
            </p>
            <p className="border-l-2 border-primary/30 pl-2 text-xs italic text-muted-foreground">{tutor.review}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
