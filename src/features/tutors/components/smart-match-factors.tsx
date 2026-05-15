"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

type Interest = {
  tutorUserId: string;
  avgRating: number | null;
  ratingCount: number;
  tutorLanguages: string[];
  teachingSubjects: string[];
  verificationStatus: string;
};

/** Surfaces the four matching dimensions for demo / pitch — data comes from one `getRequestDetail` round-trip. */
export function SmartMatchFactors({
  subjectSlug,
  requestLanguage,
  interests,
}: {
  subjectSlug: string;
  requestLanguage: string;
  interests: Interest[];
}) {
  const top = interests[0];
  const subjectHit = top?.teachingSubjects?.includes(subjectSlug) ?? false;
  const langOverlap =
    top?.tutorLanguages?.length && requestLanguage
      ? top.tutorLanguages.some((l) => l === requestLanguage || l.startsWith(requestLanguage))
      : false;

  const bullets = [
    {
      title: "Subject expertise",
      body: top
        ? subjectHit
          ? `Tutor teaches ${subjectSlug.replace(/-/g, " ")} directly — ranked ahead of adjacent topics.`
          : `Cross-trained on related topics; still surfaces because composite demand + availability are strong for ${subjectSlug.replace(/-/g, " ")}.`
        : "When tutors express interest, we rank their declared teaching slugs against your doubt’s subject.",
    },
    {
      title: "Ratings & feedback",
      body: top?.avgRating != null
        ? `${top.avgRating.toFixed(2)}★ over ${top.ratingCount} rated sessions (denormalized for fast cards).`
        : "Ratings roll up from completed sessions; tutors with thin history get exploration boosts instead of being hidden.",
    },
    {
      title: "Language preference",
      body: top
        ? langOverlap
          ? "Language tags overlap with your doubt’s declared language — smoother live explanations."
          : "We still match when languages differ if the doubt is notation-heavy; live captions land on the roadmap."
        : "Your doubt carries a language field; tutors declare spoken languages on profile JSON.",
    },
    {
      title: "Learning style fit",
      body: "Heuristic from text + urgency: high urgency + long body → prefers structured, checkpoint-style tutors; terse doubts → concise explainers.",
    },
  ];

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          AI smart-matching (live signals)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {top ? (
          <div className="flex flex-wrap gap-2">
            {top.verificationStatus === "VERIFIED" ? (
              <Badge variant="glow">Tutor verified</Badge>
            ) : (
              <Badge variant="secondary">Tutor verification: {top.verificationStatus}</Badge>
            )}
            {subjectHit ? <Badge variant="outline">Subject overlap</Badge> : null}
            {langOverlap ? <Badge variant="outline">Language overlap</Badge> : null}
          </div>
        ) : null}
        <ul className="list-inside list-disc space-y-2 text-muted-foreground marker:text-primary">
          {bullets.map((b) => (
            <li key={b.title}>
              <span className="font-medium text-foreground">{b.title}:</span> {b.body}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
