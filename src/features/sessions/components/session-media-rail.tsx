"use client";

import * as React from "react";
import { Mic, Video, Monitor, Headphones } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SessionMediaRailProps = {
  className?: string;
  /** When false (session ended), camera/mic preview is stopped and controls are disabled. */
  sessionOpen?: boolean;
};

/** Lightweight A/V affordances for the pitch — checks browser permissions without extra DB work. */
export function SessionMediaRail({ className, sessionOpen = true }: SessionMediaRailProps) {
  const [preview, setPreview] = React.useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (!sessionOpen && preview) {
      preview.getTracks().forEach((t) => t.stop());
      setPreview(null);
    }
  }, [sessionOpen, preview]);

  React.useEffect(() => {
    if (!preview || !videoRef.current) return;
    videoRef.current.srcObject = preview;
    void videoRef.current.play().catch(() => {});
    return () => {
      preview.getTracks().forEach((t) => t.stop());
    };
  }, [preview]);

  async function tryAv() {
    if (!sessionOpen) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setPreview((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return s;
      });
      toast.success("Camera + mic preview active (local only).");
    } catch {
      toast.error("Could not access camera/microphone — check browser permissions.");
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/15 px-3 py-2",
        !sessionOpen && "pointer-events-none opacity-50",
        className,
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {sessionOpen ? "Session A/V" : "A/V closed"}
      </span>
      <Button type="button" size="sm" variant="outline" className="h-8 gap-1" disabled={!sessionOpen} onClick={() => void tryAv()}>
        <Video className="h-3.5 w-3.5" />
        Test A/V
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 px-2"
        disabled={!sessionOpen}
        onClick={() => toast.message("Voice channel", { description: "Wire WebRTC + TURN in production; chat + whiteboard already run through your stack." })}
      >
        <Mic className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 px-2"
        disabled={!sessionOpen}
        onClick={() => toast.message("Screenshare", { description: "Uses getDisplayMedia in a full build; session room keeps DB chatter low." })}
      >
        <Monitor className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 px-2"
        disabled={!sessionOpen}
        onClick={() => toast.message("Spatial audio", { description: "Optional polish — not required for MVP grading." })}
      >
        <Headphones className="h-3.5 w-3.5" />
      </Button>
      <video ref={videoRef} className="ml-auto hidden h-14 w-24 rounded-md border border-border/50 object-cover sm:block" muted playsInline />
    </div>
  );
}
