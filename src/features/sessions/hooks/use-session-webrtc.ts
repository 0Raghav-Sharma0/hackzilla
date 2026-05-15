"use client";

import * as React from "react";
import type { Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "@/server/socket/events";
import type { WebrtcIcePayload, WebrtcPeerReadyPayload, WebrtcSignalPayload } from "@/server/socket/events";

function defaultIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
  try {
    const raw = process.env.NEXT_PUBLIC_WEBRTC_ICE_SERVERS;
    if (raw) {
      const extra = JSON.parse(raw) as unknown;
      if (Array.isArray(extra)) servers.push(...(extra as RTCIceServer[]));
    }
  } catch {
    /* ignore invalid JSON */
  }
  return servers;
}

export type UseSessionWebrtcOpts = {
  sessionId: string;
  localUserId: string;
  remoteUserId: string;
  socket: Socket | null;
  sessionSubscribed: boolean;
  enabled: boolean;
};

/**
 * 1:1 WebRTC (mic + optional screen) over Socket.IO signaling.
 * Uses public STUN; add TURN via NEXT_PUBLIC_WEBRTC_ICE_SERVERS for strict NATs.
 */
export function useSessionWebrtc(opts: UseSessionWebrtcOpts) {
  const { sessionId, localUserId, remoteUserId, socket, sessionSubscribed, enabled } = opts;

  const [voiceActive, setVoiceActive] = React.useState(false);
  const [screenActive, setScreenActive] = React.useState(false);
  const [peerReady, setPeerReady] = React.useState(false);
  const [remoteStream, setRemoteStream] = React.useState<MediaStream | null>(null);
  const [pcState, setPcState] = React.useState<RTCPeerConnectionState | "new">("new");
  const [lastError, setLastError] = React.useState<string | null>(null);

  const polite = localUserId < remoteUserId;
  const pcRef = React.useRef<RTCPeerConnection | null>(null);
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const screenSendersRef = React.useRef<RTCRtpSender[]>([]);
  const peerReadyRef = React.useRef(false);
  const offerLockRef = React.useRef(false);
  const icePendingRef = React.useRef<RTCIceCandidateInit[]>([]);
  const pendingOfferSdpRef = React.useRef<string | null>(null);
  const voiceActiveRef = React.useRef(false);
  const screenActiveRef = React.useRef(false);
  const sessionSubscribedRef = React.useRef(sessionSubscribed);
  const socketRef = React.useRef(socket);
  const sessionIdRef = React.useRef(sessionId);

  React.useEffect(() => {
    sessionSubscribedRef.current = sessionSubscribed;
    socketRef.current = socket;
    sessionIdRef.current = sessionId;
    voiceActiveRef.current = voiceActive;
    screenActiveRef.current = screenActive;
  }, [sessionSubscribed, socket, sessionId, voiceActive, screenActive]);

  const flushIce = React.useCallback(async (pc: RTCPeerConnection) => {
    const q = [...icePendingRef.current];
    icePendingRef.current = [];
    for (const c of q) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const teardownPc = React.useCallback(() => {
    const pc = pcRef.current;
    pcRef.current = null;
    if (pc) {
      pc.onnegotiationneeded = null;
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
    }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    for (const sender of screenSendersRef.current) {
      try {
        sender.track?.stop();
        void sender.replaceTrack(null);
      } catch {
        /* ignore */
      }
    }
    screenSendersRef.current = [];
    icePendingRef.current = [];
    pendingOfferSdpRef.current = null;
    setRemoteStream(null);
    setPcState("new");
    setPeerReady(false);
    peerReadyRef.current = false;
    setScreenActive(false);
    screenActiveRef.current = false;
  }, []);

  const emitIce = React.useCallback((candidate: RTCIceCandidateInit | null) => {
    const s = socketRef.current;
    if (!s?.connected || !sessionSubscribedRef.current) return;
    s.emit(ClientToServerEvents.WEBRTC_ICE, {
      sessionId: sessionIdRef.current,
      candidate,
    });
  }, []);

  const ensurePc = React.useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: defaultIceServers() });
    pcRef.current = pc;
    pc.onicecandidate = (ev) => {
      emitIce(ev.candidate?.toJSON() ?? null);
    };
    pc.ontrack = (ev) => {
      const [s] = ev.streams;
      if (s) setRemoteStream(s);
    };
    pc.onconnectionstatechange = () => {
      setPcState(pc.connectionState);
    };
    pc.onnegotiationneeded = () => {
      if (!sessionSubscribedRef.current) return;
      const s = socketRef.current;
      if (!s?.connected || !pcRef.current) return;
      if (offerLockRef.current) return;
      if (pc.signalingState !== "stable") return;
      void (async () => {
        offerLockRef.current = true;
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          s.emit(ClientToServerEvents.WEBRTC_SIGNAL, {
            sessionId: sessionIdRef.current,
            type: "offer",
            sdp: pc.localDescription!.sdp!,
          });
        } catch {
          /* glare — retry by toggling media */
        } finally {
          offerLockRef.current = false;
        }
      })();
    };
    return pc;
  }, [emitIce]);

  const sendPoliteOffer = React.useCallback(async () => {
    const pc = pcRef.current;
    const s = socketRef.current;
    if (!polite || !pc || !s?.connected || !sessionSubscribedRef.current) return;
    if (!peerReadyRef.current) return;
    if (pc.signalingState !== "stable") return;
    if (pc.remoteDescription) return;
    if (offerLockRef.current) return;
    offerLockRef.current = true;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      s.emit(ClientToServerEvents.WEBRTC_SIGNAL, {
        sessionId: sessionIdRef.current,
        type: "offer",
        sdp: pc.localDescription!.sdp!,
      });
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Could not start voice negotiation");
    } finally {
      offerLockRef.current = false;
    }
  }, [polite]);

  const handleRemoteOffer = React.useCallback(
    async (sdp: string) => {
      if (!voiceActiveRef.current && !screenActiveRef.current) {
        pendingOfferSdpRef.current = sdp;
        return;
      }
      const pc = ensurePc();
      const s = socketRef.current;
      if (!s?.connected || !sessionSubscribedRef.current) {
        pendingOfferSdpRef.current = sdp;
        return;
      }
      await pc.setRemoteDescription({ type: "offer", sdp });
      await flushIce(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      s.emit(ClientToServerEvents.WEBRTC_SIGNAL, {
        sessionId: sessionIdRef.current,
        type: "answer",
        sdp: pc.localDescription!.sdp!,
      });
    },
    [ensurePc, flushIce],
  );

  const handleRemoteAnswer = React.useCallback(
    async (sdp: string) => {
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription({ type: "answer", sdp });
      await flushIce(pc);
    },
    [flushIce],
  );

  React.useEffect(() => {
    if (!enabled) {
      setVoiceActive(false);
      voiceActiveRef.current = false;
      teardownPc();
    }
  }, [enabled, teardownPc]);

  React.useEffect(() => {
    if (!socket || !sessionSubscribed) return;

    const onPeerReady = (p: WebrtcPeerReadyPayload) => {
      if (p.sessionId !== sessionId || p.userId !== remoteUserId) return;
      setPeerReady(true);
      peerReadyRef.current = true;
    };

    const onSignal = (p: WebrtcSignalPayload) => {
      if (p.sessionId !== sessionId || p.fromUserId !== remoteUserId) return;
      void (async () => {
        try {
          if (p.type === "offer") {
            await handleRemoteOffer(p.sdp);
          } else {
            await handleRemoteAnswer(p.sdp);
          }
        } catch (e) {
          setLastError(e instanceof Error ? e.message : "WebRTC signaling failed");
        }
      })();
    };

    const onIce = (p: WebrtcIcePayload) => {
      if (p.sessionId !== sessionId || p.fromUserId !== remoteUserId) return;
      const cand = p.candidate;
      if (!cand?.candidate) return;
      const pc = pcRef.current;
      if (!pc?.remoteDescription) {
        icePendingRef.current.push(cand);
        return;
      }
      void pc.addIceCandidate(cand).catch(() => {});
    };

    socket.on(ServerToClientEvents.WEBRTC_PEER_READY, onPeerReady);
    socket.on(ServerToClientEvents.WEBRTC_SIGNAL, onSignal);
    socket.on(ServerToClientEvents.WEBRTC_ICE, onIce);
    return () => {
      socket.off(ServerToClientEvents.WEBRTC_PEER_READY, onPeerReady);
      socket.off(ServerToClientEvents.WEBRTC_SIGNAL, onSignal);
      socket.off(ServerToClientEvents.WEBRTC_ICE, onIce);
    };
  }, [socket, sessionSubscribed, sessionId, remoteUserId, handleRemoteOffer, handleRemoteAnswer]);

  React.useEffect(() => {
    if (!polite || !peerReady || !voiceActive || !sessionSubscribed || !socket?.connected) return;
    const pc = pcRef.current;
    if (!pc || pc.remoteDescription) return;
    void sendPoliteOffer();
  }, [polite, peerReady, voiceActive, sessionSubscribed, socket, sendPoliteOffer]);

  const stopVoice = React.useCallback(() => {
    setVoiceActive(false);
    voiceActiveRef.current = false;
    teardownPc();
    setLastError(null);
  }, [teardownPc]);

  const startVoice = React.useCallback(async () => {
    if (!sessionSubscribed || !socket?.connected) {
      setLastError("Waiting for live session connection…");
      return;
    }
    setLastError(null);
    try {
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      const base = localStreamRef.current ?? new MediaStream();
      localStreamRef.current = base;
      const pc = ensurePc();
      for (const t of mic.getAudioTracks()) {
        base.addTrack(t);
        pc.addTrack(t, base);
      }
      setVoiceActive(true);
      voiceActiveRef.current = true;
      socket.emit(ClientToServerEvents.WEBRTC_READY, { sessionId });

      if (pendingOfferSdpRef.current) {
        const sdp = pendingOfferSdpRef.current;
        pendingOfferSdpRef.current = null;
        await handleRemoteOffer(sdp);
      } else if (polite && peerReadyRef.current) {
        await sendPoliteOffer();
      }
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Microphone permission denied");
    }
  }, [sessionSubscribed, socket, sessionId, ensurePc, handleRemoteOffer, sendPoliteOffer]);

  const toggleVoice = React.useCallback(() => {
    if (voiceActive) stopVoice();
    else void startVoice();
  }, [voiceActive, stopVoice, startVoice]);

  const stopScreen = React.useCallback(() => {
    const pc = pcRef.current;
    if (!pc) {
      screenSendersRef.current = [];
      setScreenActive(false);
      screenActiveRef.current = false;
      return;
    }
    for (const sender of screenSendersRef.current) {
      try {
        sender.track?.stop();
        void sender.replaceTrack(null);
        if (pc) pc.removeTrack(sender);
      } catch {
        /* ignore */
      }
    }
    screenSendersRef.current = [];
    setScreenActive(false);
    screenActiveRef.current = false;
  }, []);

  const startScreen = React.useCallback(async () => {
    if (!sessionSubscribed || !socket?.connected) {
      setLastError("Waiting for live session connection…");
      return;
    }
    setLastError(null);
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { max: 30 } },
        audio: true,
      });
      const pc = ensurePc();
      const base = localStreamRef.current ?? new MediaStream();
      if (!localStreamRef.current) localStreamRef.current = base;
      const senders: RTCRtpSender[] = [];
      for (const t of display.getTracks()) {
        const sender = pc.addTrack(t, base);
        senders.push(sender);
        t.addEventListener("ended", () => {
          stopScreen();
        });
      }
      screenSendersRef.current = senders;
      setScreenActive(true);
      screenActiveRef.current = true;
      socket.emit(ClientToServerEvents.WEBRTC_READY, { sessionId });
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Screen sharing was cancelled or blocked");
    }
  }, [sessionSubscribed, socket, sessionId, ensurePc, stopScreen]);

  const toggleScreen = React.useCallback(() => {
    if (screenActive) stopScreen();
    else void startScreen();
  }, [screenActive, stopScreen, startScreen]);

  return {
    voiceActive,
    screenActive,
    peerReady,
    remoteStream,
    pcState,
    lastError,
    setLastError,
    toggleVoice,
    toggleScreen,
    stopVoice,
  };
}
