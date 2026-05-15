"use client";

import * as React from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { submitContentReport } from "@/features/trust/actions";

type Target = { targetType: "HELP_REQUEST" | "USER" | "SESSION"; targetId: string };

export function ReportContentDialog({ target, label = "Report" }: { target: Target; label?: string }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function onSubmit() {
    if (reason.trim().length < 3) {
      toast.error("Add a short description (3+ characters).");
      return;
    }
    setPending(true);
    try {
      await submitContentReport({ ...target, reason: reason.trim() });
      toast.success("Thanks — moderators will review this report.");
      setReason("");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit report");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
          <Flag className="h-3.5 w-3.5" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Community report</DialogTitle>
          <DialogDescription>
            Describe what is wrong (spam, harassment, academic integrity, etc.). This sends a single record to the moderation queue.
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What should moderators know?"
          rows={4}
          className={cn(
            "flex min-h-[100px] w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="glow" disabled={pending} onClick={() => void onSubmit()}>
            {pending ? "Sending…" : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
