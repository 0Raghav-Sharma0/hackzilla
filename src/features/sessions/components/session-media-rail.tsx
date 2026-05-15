"use client";

import * as React from "react";
import { Mic, Video, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSocketIo } from "@/features/realtime/socket-io-provider";
import { useSessionWebrtc } from "@/features/sessions/hooks/use-session-webrtc";
import { cn } from "@/lib/utils";

type SessionMediaRailProps = {
  className?: string;
  sessionOpen?: boolean;
  sessionId: string;
  /** `session:subscribe` ack — room join on the socket server. */
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
  const { socket, connected, webRtcIceServers } = useSocketIo();
  const signalingReady = sessionOpen && connected && sessionSubscribed;

  const webrtc = useSessionWebrtc({
    sessionId,
    localUserId: viewerId,
    remoteUserId: peerUserId,
    socket: socket ?? null,
    roomSubscribed: sessionSubscribed,
    signalingReady,
    enabled: sessionOpen,
    iceServersFromToken: webRtcIceServers,
  });

  const mainVideoRef = React.useRef<HTMLVideoElement>(null);
  const pipVideoRef = React.useRef<HTMLVideoElement>(null);
  const remoteAudioRef = React.useRef<HTMLAudioElement>(null);

  const remoteLive = webrtc.remoteStream?.getTracks().some((t) => t.readyState === "live") ?? false;

  React.useEffect(() => {
    const main = mainVideoRef.current;
    const audio = remoteAudioRef.current;
    if (!main) return;

    if (remoteLive && webrtc.remoteStream) {
      const rs = webrtc.remoteStream;
      const hasRemoteVideo = rs.getVideoTracks().some((t) => t.readyState === "live");
      main.srcObject = rs;
      main.muted = false;
      main.volume = 1;
      if (audio) {
        /* Same stream on video+audio can double-play remote audio in some engines — audio sink only when remote is audio-only. */
        if (hasRemoteVideo) {
          audio.srcObject = null;
        } else {
          audio.srcObject = rs;
          audio.muted = false;
          audio.volume = 1;
        }
      }
    } else {
      main.srcObject = webrtc.localPreviewStream;
      main.muted = true;
      if (audio) {
        audio.srcObject = null;
      }
    }

    void main.play().catch(() => {});
    if (audio) void audio.play().catch(() => {});
  }, [remoteLive, webrtc.remoteStream, webrtc.localPreviewStream]);

  React.useEffect(() => {
    const pip = pipVideoRef.current;
    if (!pip) return;
    const pipStream = remoteLive ? webrtc.localPreviewStream : null;
    pip.srcObject = pipStream;
    pip.muted = true;
    void pip.play().catch(() => {});
  }, [remoteLive, webrtc.localPreviewStream]);

  React.useEffect(() => {
    if (webrtc.lastError && !webrtc.lastError.startsWith("Waiting")) {
      toast.error(webrtc.lastError);
    }
    webrtc.setLastError(null);
  }, [webrtc.lastError, webrtc.setLastError]);

  const mediaOn = webrtc.voiceActive || webrtc.screenActive || webrtc.cameraActive;
  const showRemote = remoteLive;
  const hasMainPreview = showRemote || !!webrtc.localPreviewStream;

  const statusLabel = !connected
    ? mediaOn
      ? "Local preview — realtime offline"
      : "Realtime offline"
    : !sessionSubscribed
      ? "Joining room…"
      : mediaOn
        ? webrtc.peerReady
          ? `Call · ${webrtc.pcState}`
          : signalingReady
            ? "Waiting for peer…"
            : "Local preview only"
        : "Voice & video off";

  return (
    <div className={cn("flex flex-col gap-2 rounded-lg border bg-muted/30 p-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Session A/V</span>
        <span className="max-w-[60%] text-right text-[10px] text-muted-foreground">{statusLabel}</span>
      </div>

      <div
        className={cn(
          "relative w-full overflow-hidden rounded-md border border-border/60 bg-black/[0.06] dark:bg-black/50",
          "aspect-video max-h-[min(40vh,320px)]",
        )}
      >
        {hasMainPreview ? (
          <>
            {/* Hidden audio sink: some browsers play WebRTC remote audio more reliably alongside video. */}
            <audio ref={remoteAudioRef} className="hidden" playsInline autoPlay />
            <video ref={mainVideoRef} className="h-full w-full object-contain" playsInline autoPlay />
            <video
              ref={pipVideoRef}
              className={cn(
                "absolute bottom-2 right-2 aspect-video w-[28%] min-w-[96px] max-w-[200px] overflow-hidden rounded-md border-2 border-background object-cover shadow-md",
                !showRemote && "hidden",
              )}
              playsInline
              autoPlay
            />
          </>
        ) : (
          <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-1 px-4 text-center text-[11px] text-muted-foreground">
            <Volume2 className="h-6 w-6 opacity-40" aria-hidden />
            <span>Turn on mic or camera to preview. Remote video appears here when your partner connects.</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={webrtc.voiceActive ? "default" : "outline"}
          className="h-8 gap-1"
          disabled={!sessionOpen}
          onClick={() => void webrtc.toggleVoice()}
        >
          <Mic className="h-3.5 w-3.5" />
          {webrtc.voiceActive ? "Mic on" : "Mic off"}
        </Button>

        <Button
          type="button"
          size="sm"
          variant={webrtc.cameraActive ? "default" : "outline"}
          className="h-8 gap-1"
          disabled={!sessionOpen}
          onClick={() => void webrtc.toggleCamera()}
        >
          <Video className="h-3.5 w-3.5" />
          {webrtc.cameraActive ? "Camera on" : "Camera off"}
        </Button>
      </div>
    </div>
  );
}
