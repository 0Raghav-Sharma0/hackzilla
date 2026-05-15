"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check, Loader2, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createHelpRequest } from "@/features/help-requests/actions";
import { useRealtime } from "@/features/realtime/realtime-provider";
import { useCelebration } from "@/features/gamification/use-celebration";
import { mockCategorize } from "@/features/help-requests/ai-mock";
import { cn } from "@/lib/utils";

const SUBJECTS = [
  { slug: "calculus", label: "Calculus" },
  { slug: "linear-algebra", label: "Linear algebra" },
  { slug: "physics", label: "Physics" },
  { slug: "cs-fundamentals", label: "CS fundamentals" },
];

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function CreateRequestModal({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { emit } = useRealtime();
  const celebrate = useCelebration();
  const minBodyLength = 12;
  const [step, setStep] = React.useState(0);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [subjectSlug, setSubjectSlug] = React.useState("calculus");
  const [urgency, setUrgency] = React.useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [duration, setDuration] = React.useState(45);
  const [language, setLanguage] = React.useState("en");
  const [previewTags, setPreviewTags] = React.useState<{ tag: string; confidence: number }[]>([]);

  React.useEffect(() => {
    if (!title && !body) {
      setPreviewTags([]);
      return;
    }
    const t = window.setTimeout(() => {
      setPreviewTags(mockCategorize({ title, body, subjectSlug }).slice(0, 4));
    }, 320);
    return () => window.clearTimeout(t);
  }, [title, body, subjectSlug]);

  React.useEffect(() => {
    if (!open) {
      window.setTimeout(() => {
        setStep(0);
        setTitle("");
        setBody("");
        setSubjectSlug("calculus");
        setUrgency("MEDIUM");
        setDuration(45);
        setLanguage("en");
      }, 300);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      return createHelpRequest({
        title,
        body,
        subjectSlug,
        urgency,
        preferredDurationMinutes: duration,
        language,
      });
    },
    onSuccess: (res) => {
      toast.success("Doubt published", { description: "Live on the campus feed — tutors can react now." });
      celebrate("achievement");
      emit({ type: "REQUEST_CREATED", requestId: res.id });
      void qc.invalidateQueries({ queryKey: ["requests-feed"] });
      onOpenChange(false);
    },
    onError: (e: Error) => {
      toast.error(e.message || "Could not publish");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border/70 bg-card/95 p-0 sm:max-w-lg">
        <div className="border-b border-border/60 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 px-6 py-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Zap className="h-5 w-5 text-primary" />
              New doubt
            </DialogTitle>
            <DialogDescription>AI tags generate on save — your doubt hits the realtime feed instantly.</DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="flex gap-2">
            {["Compose", "Details", "Publish"].map((label, i) => {
              const canGoTo = (() => {
                if (i === 0) return true;
                if (i === 1) return title.trim().length >= 4 && body.trim().length >= 12;
                if (i === 2) return title.trim().length >= 4 && body.trim().length >= 12;
                return false;
              })();

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => canGoTo && setStep(i)}
                  disabled={!canGoTo}
                  className={cn(
                    "flex-1 rounded-lg border px-2 py-1.5 text-center text-xs font-medium transition-colors",
                    step === i ? "border-primary/50 bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground",
                    !canGoTo && "opacity-60 cursor-not-allowed",
                  )}
                >
                  {i + 1}. {label}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {step === 0 ? (
              <motion.div key="s0" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-3">
                <label className="text-sm font-medium">Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Stuck on recurrence for merge sort" className="bg-background/50" />
                <label className="text-sm font-medium">Describe the doubt</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Context, what you tried, where you’re blocked…"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Minimum {minBodyLength} characters</span>
                  <span className={cn(body.trim().length < minBodyLength ? "text-amber-400" : "text-emerald-400")}>
                    {body.trim().length}/{minBodyLength}
                  </span>
                </div>
                {body.trim().length > 0 && body.trim().length < minBodyLength ? (
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      Description is too short. Add at least {minBodyLength} characters so the request can be published.
                    </p>
                  </div>
                ) : null}
              </motion.div>
            ) : null}
            {step === 1 ? (
              <motion.div key="s1" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium">Subject</p>
                  <div className="grid grid-cols-2 gap-2">
                    {SUBJECTS.map((s) => (
                      <button
                        key={s.slug}
                        type="button"
                        onClick={() => setSubjectSlug(s.slug)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-left text-sm transition-all",
                          subjectSlug === s.slug ? "border-primary/60 bg-primary/10 shadow-glow" : "border-border/60 hover:bg-muted/40",
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">Urgency</p>
                  <div className="flex gap-2">
                    {(["LOW", "MEDIUM", "HIGH"] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUrgency(u)}
                        className={cn(
                          "flex-1 rounded-lg border py-2 text-xs font-semibold uppercase tracking-wide",
                          urgency === u ? "border-primary/60 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground",
                        )}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-sm font-medium">
                    <span>Session length</span>
                    <span className="font-mono text-muted-foreground">{duration} min</span>
                  </div>
                  <input type="range" min={15} max={120} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full accent-primary" />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">Language</p>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="hi">हिन्दी</option>
                  </select>
                </div>
              </motion.div>
            ) : null}
            {step === 2 ? (
              <motion.div key="s2" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-4">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-primary">AI preview</p>
                  <p className="mt-1 text-sm font-medium">{title || "Untitled doubt"}</p>
                  <Separator className="my-3" />
                  <div className="flex flex-wrap gap-1.5">
                    {previewTags.length ? (
                      previewTags.map((t) => (
                        <Badge key={t.tag} variant="glow" className="font-normal">
                          <Sparkles className="mr-1 h-3 w-3" />
                          {t.tag}{" "}
                          <span className="ml-1 text-[10px] opacity-70">{Math.round(t.confidence * 100)}%</span>
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Type to see live tag suggestions…</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Publishing runs server validation, writes AI tags, and invalidates the live feed.</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <DialogFooter className="border-t border-border/60 bg-muted/10 px-6 py-4">
          <div className="flex w-full justify-between gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              Back
            </Button>
            <div className="flex gap-2">
              {step < 2 ? (
                <Button type="button" onClick={() => setStep((s) => Math.min(2, s + 1))} disabled={step === 0 && (!title.trim() || body.trim().length < minBodyLength)}>
                  Continue
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="glow"
                  disabled={mutation.isPending}
                  onClick={() => {
                    if (title.trim().length < 4) {
                      toast.error("Title must be at least 4 characters");
                      return;
                    }
                    if (body.trim().length < minBodyLength) {
                      toast.error(`Describe the doubt with at least ${minBodyLength} characters`);
                      return;
                    }
                    void mutation.mutateAsync();
                  }}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Publishing…
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Publish to feed
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
