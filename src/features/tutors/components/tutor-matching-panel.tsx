"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Sparkles, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TutorCard } from "@/features/tutors/components/tutor-card";
import { demoTutors, getMatchReason } from "@/features/tutors/demo-tutors";
import { expressInterest, getRequestDetail, matchTutor, simulateBotInterest, withdrawInterest } from "@/features/help-requests/actions";
import { useAdaptiveRefetchInterval } from "@/features/realtime/use-adaptive-refetch-interval";
import { usePageVisible } from "@/features/realtime/use-page-visible";
import { MagneticButton } from "@/components/micro/magnetic-button";
import { mockCategorize } from "@/features/help-requests/ai-mock";
import { AISkillRadar } from "@/features/ai/components/ai-skill-radar";
import { AIReasoningChain } from "@/features/ai/components/ai-reasoning-chain";
import { useCelebration } from "@/features/gamification/use-celebration";
import { SmartMatchFactors } from "@/features/tutors/components/smart-match-factors";

function radarFromRequestId(id: string): [number, number, number, number, number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const b = (shift: number) => 58 + ((h >> shift) % 38);
  return [b(1), b(3), b(5), b(7), b(9)];
}

export function TutorMatchingPanel({ requestId, subjectSlug }: { requestId: string; subjectSlug: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const celebrate = useCelebration();
  const [thinking, setThinking] = React.useState(true);

  React.useEffect(() => {
    const t = window.setTimeout(() => setThinking(false), 1400);
    return () => window.clearTimeout(t);
  }, [requestId]);

  const pageVisible = usePageVisible();
  const pollMs = useAdaptiveRefetchInterval(12_000);
  const { data, refetch } = useQuery({
    queryKey: ["request-detail", requestId],
    queryFn: () => getRequestDetail(requestId),
    refetchInterval: pageVisible ? pollMs : false,
  });

  const interestMutation = useMutation({
    mutationFn: async () => {
      if (!data?.myInterest) return expressInterest(requestId);
      return withdrawInterest(requestId);
    },
    onSuccess: () => {
      void refetch();
      void qc.invalidateQueries({ queryKey: ["requests-feed"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const botMutation = useMutation({
    mutationFn: () => simulateBotInterest(requestId),
    onSuccess: () => {
      toast.success("Loop Bot is interested (demo)");
      void refetch();
      void qc.invalidateQueries({ queryKey: ["requests-feed"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const matchMutation = useMutation({
    mutationFn: (tutorUserId: string) => matchTutor({ requestId, tutorUserId }),
    onSuccess: (res) => {
      celebrate("success");
      toast.success("Matched — session opening");
      void qc.invalidateQueries({ queryKey: ["requests-feed"] });
      void refetch();
      router.push(`/dashboard/sessions/${res.sessionId}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!data) return null;

  const firstTutorId = data.interests[0]?.tutorUserId;
  const tags = mockCategorize({
    title: data.title,
    body: data.fullBody ?? "",
    subjectSlug: data.subjectSlug,
  });
  const t0 = tags[0]?.tag ?? "concept mastery";
  const t1 = tags[1]?.tag ?? "exam pacing";
  const steps = [
    `Parsed doubt text + urgency to prioritize ${subjectSlug.replace(/-/g, " ")} supply on your campus slice.`,
    `Matched latent topics (“${t0}”, “${t1}”) against tutor session history and student ratings.`,
    `Applied latency-aware boosts so fast responders surface without gaming the system.`,
    `Re-ranked for teaching-style fit — cards below are the top composite matches.`,
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-primary" />
          AI-ranked tutors
        </h2>
        <Badge variant="glow" className="font-mono text-[10px]">
          Live interest · {data.interestCount}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">Demo cards + real interests from the database. Match uses the first real interested tutor.</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <AISkillRadar values={radarFromRequestId(requestId)} className="rounded-xl border border-border/50 bg-muted/10 p-3" />
        <AIReasoningChain steps={steps} thinking={thinking} />
      </div>

      <SmartMatchFactors subjectSlug={subjectSlug} requestLanguage={data.language} interests={data.interests} />

      <div className="grid gap-3 lg:grid-cols-2">
        {demoTutors.map((t) => (
          <TutorCard key={t.id} tutor={t} reason={getMatchReason(t, subjectSlug)} layoutId={`tutor-${requestId}-${t.id}`} />
        ))}
      </div>

      <Separator className="bg-border/60" />

      <div className="space-y-2">
        <p className="text-sm font-medium">Interested tutors</p>
        {data.interests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tutors yet — open another tab as tutor, or use the demo bot.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.interests.map((i) => (
              <li key={i.tutorUserId} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                <span>{i.displayName}</span>
                <span className="text-xs text-muted-foreground">{new Date(i.createdAt).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {!data.viewerIsAuthor ? (
          <MagneticButton
            type="button"
            className="rounded-lg border border-border/60 bg-background/50 px-4 py-2 text-sm font-medium hover:bg-muted/40"
            onClick={() => void interestMutation.mutateAsync()}
          >
            <UserPlus className="mr-2 inline h-4 w-4" />
            {data.myInterest ? "Withdraw interest" : "I can teach this"}
          </MagneticButton>
        ) : null}
        {data.viewerIsAuthor ? (
          <Button type="button" variant="outline" className="gap-2" onClick={() => void botMutation.mutateAsync()}>
            <Bot className="h-4 w-4" />
            Demo: Loop Bot interested
          </Button>
        ) : null}
        {data.viewerIsAuthor ? (
          <Button type="button" variant="glow" disabled={!firstTutorId} onClick={() => firstTutorId && matchMutation.mutate(firstTutorId)}>
            Match first interested tutor
          </Button>
        ) : null}
        <Button variant="ghost" asChild>
          <Link href="/dashboard/requests">Back to feed</Link>
        </Button>
      </div>
    </div>
  );
}
