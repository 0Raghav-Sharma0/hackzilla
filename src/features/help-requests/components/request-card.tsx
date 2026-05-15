"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Flame, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/micro/animated-counter";
import { cn } from "@/lib/utils";

export type FeedItem = {
  id: string;
  title: string;
  body: string;
  subjectSlug: string;
  urgency: string;
  preferredDurationMinutes: number;
  language: string;
  createdAt: string;
  author: { id: string; displayName: string; avatarUrl: string | null };
  tags: { tag: string; confidence: number }[];
  interestCount: number;
};

export function RequestCard({ item, index = 0 }: { item: FeedItem; index?: number }) {
  const urgencyColor =
    item.urgency === "HIGH" ? "text-rose-400 border-rose-500/30 bg-rose-500/10" : item.urgency === "MEDIUM" ? "text-amber-300 border-amber-500/30 bg-amber-500/10" : "text-emerald-300 border-emerald-500/20 bg-emerald-500/10";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.035, 0.2), type: "spring", stiffness: 380, damping: 28 }}>
      <Link href={`/dashboard/requests/${item.id}`}>
        <Card className="group relative overflow-hidden border-border/70 bg-card/70 p-4 shadow-card backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {item.subjectSlug.replace(/-/g, " ")}
                </Badge>
                <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase", urgencyColor)}>
                  <Flame className="mr-1 inline h-3 w-3" />
                  {item.urgency}
                </span>
                <span className="text-[11px] text-muted-foreground">{item.preferredDurationMinutes} min · {item.language}</span>
              </div>
              <h3 className="line-clamp-2 font-semibold leading-snug tracking-tight group-hover:text-primary">{item.title}</h3>
              <p className="line-clamp-2 text-sm text-muted-foreground">{item.body}</p>
              <div className="flex flex-wrap gap-1">
                {item.tags.slice(0, 4).map((t) => (
                  <span key={t.tag} className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                    {t.tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-primary" />
                <AnimatedCounter value={item.interestCount} className="tabular-nums text-foreground" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            by <span className="font-medium text-foreground">{item.author.displayName}</span> · {new Date(item.createdAt).toLocaleString()}
          </p>
        </Card>
      </Link>
    </motion.div>
  );
}
