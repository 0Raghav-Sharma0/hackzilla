"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { submitSessionRating } from "@/features/help-requests/actions";
import { cn } from "@/lib/utils";

export function SessionRatingPanel({
  sessionId,
  viewerCanRate,
  sessionRatingStars,
}: {
  sessionId: string;
  viewerCanRate: boolean;
  sessionRatingStars?: number | null;
}) {
  const queryClient = useQueryClient();
  const [stars, setStars] = React.useState(0);
  const [comment, setComment] = React.useState("");

  const rate = useMutation({
    mutationFn: () => submitSessionRating({ sessionId, stars, comment: comment.trim() || undefined }),
    onSuccess: (res) => {
      const micro = BigInt(res.tutorPayoutMicrocredits);
      const fee = BigInt(res.studentSessionFeeMicrocredits ?? "0");
      const display = Number(micro) / 1_000_000;
      const feeDisplay = Number(fee) / 1_000_000;
      toast.success(
        feeDisplay > 0
          ? `Rated — about ${feeDisplay.toFixed(1)} credits session fee from you; your tutor earned about ${display.toFixed(1)} credits.`
          : display >= 1
            ? `Rated — your tutor earned about ${display.toFixed(1)} credits from this session.`
            : "Thanks for rating — your tutor’s payout is on the way.",
      );
      void queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!viewerCanRate && sessionRatingStars == null) {
    return null;
  }

  if (!viewerCanRate && sessionRatingStars != null) {
    return (
      <Card className="border-emerald-500/25 bg-emerald-500/5 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your rating</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <StarRow value={sessionRatingStars} readOnly />
          <p className="text-xs">Thanks — this session is closed and your tutor has been credited.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/25 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Rate this session</CardTitle>
        <p className="text-xs font-normal text-muted-foreground">
          Your stars set how many credits your tutor earns for this completed session.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <StarRow value={stars} onChange={setStars} />
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`session-rate-note-${sessionId}`}>
            Optional note
          </label>
          <Input
            id={`session-rate-note-${sessionId}`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What helped most?"
            className="bg-background/50"
            maxLength={2000}
          />
        </div>
        <Button variant="glow" disabled={stars < 1 || rate.isPending} onClick={() => void rate.mutateAsync()}>
          {rate.isPending ? "Submitting…" : "Submit rating"}
        </Button>
      </CardContent>
    </Card>
  );
}

function StarRow({
  value,
  onChange,
  readOnly,
}: {
  value: number;
  onChange?: (n: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          className={cn(
            "rounded-md p-1 transition-colors",
            readOnly ? "cursor-default" : "hover:bg-primary/10",
          )}
          aria-label={`${n} stars`}
        >
          <Star
            className={cn(
              "h-8 w-8",
              n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}
