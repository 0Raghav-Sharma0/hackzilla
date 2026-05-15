"use client";

import * as React from "react";
import { Mic, Video, Monitor, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSocketIo } from "@/features/realtime/socket-io-provider";
import { useSessionWebrtc } from "@/features/sessions/hooks/use-session-webrtc";
import { cn } from "@/lib/utils";

type SessionMediaRailProps = {
  className?: string;
  sessionOpen?: boolean;
  sessionId: string;
  sessionSubscribed: boolean;
  viewerId: string;
  peerUserId: string;
};

export function SessionMediaRail({
  className,
  sessionOpen = true,
  sessionId,
  sessionSubscribed,
  viewerId,
  peerUserId,
}: SessionMediaRailProps) {
  const { socket, connected } = useSocketIo();
  const webrtc = useSessionWebrtc({
    sessionId,
    localUserId: viewerId,
    remoteUserId: peerUserId,
    socket,
    sessionSubscribed: sessionOpen && sessionSubscribed && connected,
    enabled: sessionOpen,
  });

  const remoteVideoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const el = remoteVideoRef.current;
    if (!el) return;
    el.srcObject = webrtc.remoteStream;
    void el.play().catch(() => {});
  }, [webrtc.remoteStream]);

  React.useEffect(() => {
    if (!webrtc.lastError) return;
    if (!webrtc.lastError.startsWith("Waiting")) {
      toast.error(webrtc.lastError);
    }
    webrtc.setLastError(null);
  }, [webrtc.lastError, webrtc.setLastError]);

  const statusLabel = !connected
    ? "Realtime offline"
    : !sessionSubscribed
      ? "Joining room…"
      : webrtc.voiceActive || webrtc.screenActive
        ? webrtc.peerReady
          ? `Call · ${webrtc.pcState}`
          : "Waiting for peer…"
        : "Voice & screen off";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/15 px-3 py-2",
        !sessionOpen && "pointer-events-none opacity-50",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Session A/V</span>
        <span className="text-[10px] text-muted-foreground">{statusLabel}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={webrtc.voiceActive ? "default" : "outline"}
          className="h-8 gap-1"
          disabled={!sessionOpen || !connected}
          onClick={() => void webrtc.toggleVoice()}
        >
          <Mic className="h-3.5 w-3.5" />
          {webrtc.voiceActive ? "Mic on" : "Mic off"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={webrtc.screenActive ? "default" : "outline"}
          className="h-8 gap-1"
          disabled={!sessionOpen || !connected}
          onClick={() => void webrtc.toggleScreen()}
        >
          <Monitor className="h-3.5 w-3.5" />
          {webrtc.screenActive ? "Sharing" : "Share screen"}
        </Button>
        <div className="flex items-center gap-1 rounded-md border border-border/50 bg-background/40 px-2 py-1 text-[10px] text-muted-foreground">
          <Volume2 className="h-3 w-3 shrink-0" />
          <span className="max-w-[10rem] truncate sm:max-w-[14rem]">Peer audio/video plays here when connected.</span>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <video
          ref={remoteVideoRef}
          className="max-h-32 w-full max-w-md rounded-md border border-border/60 bg-black/80 object-contain sm:max-h-40"
          playsInline
          autoPlay
          controls={false}
        />
        <div className="hidden shrink-0 items-center gap-1 text-muted-foreground sm:flex" aria-hidden>
          <Video className="h-8 w-8 opacity-30" />
        </div>
      </div>
    </div>
  );
}
