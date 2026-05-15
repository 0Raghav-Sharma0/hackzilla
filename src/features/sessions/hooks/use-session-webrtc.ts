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
  /** Room ack from socket server (session:subscribe). */
  roomSubscribed: boolean;
  /** Socket connected + room subscribed — WebRTC signaling only when true; mic/camera still work locally when false. */
  signalingReady: boolean;
  enabled: boolean;
};

/**
 * 1:1 WebRTC (mic + optional screen) over Socket.IO signaling.
 * Uses public STUN; add TURN via NEXT_PUBLIC_WEBRTC_ICE_SERVERS for strict NATs.
 */
export function useSessionWebrtc(opts: UseSessionWebrtcOpts) {
  const { sessionId, localUserId, remoteUserId, socket, roomSubscribed, signalingReady, enabled } = opts;
  const [voiceActive, setVoiceActive] = React.useState(false);
  const [screenActive, setScreenActive] = React.useState(false);
  const [cameraActive, setCameraActive] = React.useState(false);
  const [peerReady, setPeerReady] = React.useState(false);
  const [remoteStream, setRemoteStream] = React.useState<MediaStream | null>(null);
  /** Local mic/camera/screen for preview when offline or before the peer connects. */
  const [localPreviewStream, setLocalPreviewStream] = React.useState<MediaStream | null>(null);
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
  const cameraActiveRef = React.useRef(false);
  const screenActiveRef = React.useRef(false);
  const roomSubscribedRef = React.useRef(roomSubscribed);
  const signalingReadyRef = React.useRef(signalingReady);
  const socketRef = React.useRef(socket);
  const sessionIdRef = React.useRef(sessionId);

  React.useEffect(() => {
    roomSubscribedRef.current = roomSubscribed;
    signalingReadyRef.current = signalingReady;
    socketRef.current = socket;
    sessionIdRef.current = sessionId;
    voiceActiveRef.current = voiceActive;
    cameraActiveRef.current = cameraActive;
    screenActiveRef.current = screenActive;
  }, [roomSubscribed, signalingReady, socket, sessionId, voiceActive, cameraActive, screenActive]);

  const flushIce = React.useCallback(async (pc: RTCPeerConnection) => {
    const q = [...icePendingRef.current];
    icePendingRef.current = [];
    for (const c of q) {
      try {
        if (c == null || (typeof c.candidate === "string" && c.candidate.length === 0)) {
          await pc.addIceCandidate(null);
        } else {
          await pc.addIceCandidate(c);
        }
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
    setCameraActive(false);
    cameraActiveRef.current = false;
    setLocalPreviewStream(null);
  }, []);

  const emitIce = React.useCallback((candidate: RTCIceCandidateInit | null) => {
    const s = socketRef.current;
    if (!s?.connected || !signalingReadyRef.current) return;
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
      const track = ev.track;
      track.enabled = true;
      track.onended = () => {
        setRemoteStream((prev) => {
          if (!prev) return null;
          const live = prev.getTracks().filter((t) => t.id !== track.id && t.readyState === "live");
          return live.length ? new MediaStream(live) : null;
        });
      };
      /* Same underlying MediaStream can gain tracks without changing reference — always clone so React + <video> update. */
      setRemoteStream((prev) => {
        const keep = (prev?.getTracks() ?? []).filter((t) => t.id !== track.id && t.readyState === "live");
        const fromEvent = ev.streams[0]?.getTracks().filter((t) => t.readyState === "live") ?? [];
        const byId = new Map<string, MediaStreamTrack>();
        for (const t of keep) byId.set(t.id, t);
        for (const t of fromEvent) byId.set(t.id, t);
        byId.set(track.id, track);
        const bumpRemote = () => {
          setRemoteStream((p) => (p ? new MediaStream([...p.getTracks()]) : null));
        };
        track.onunmute = bumpRemote;
        track.onmute = bumpRemote;
        return new MediaStream([...byId.values()]);
      });
    };
    pc.onconnectionstatechange = () => {
      setPcState(pc.connectionState);
    };
    pc.onnegotiationneeded = () => {
      if (!signalingReadyRef.current) return;
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
    if (!polite || !pc || !s?.connected || !signalingReadyRef.current) return;
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
      if (!voiceActiveRef.current && !screenActiveRef.current && !cameraActiveRef.current) {
        pendingOfferSdpRef.current = sdp;
        return;
      }
      const pc = ensurePc();
      const s = socketRef.current;
      if (!s?.connected || !signalingReadyRef.current) {
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

  const syncLocalTracksToPc = React.useCallback(() => {
    const base = localStreamRef.current;
    const s = socketRef.current;
    if (!base || !s?.connected || !signalingReadyRef.current) return;
    const pc = ensurePc();
    for (const t of base.getTracks()) {
      if (!pc.getSenders().some((sender) => sender.track === t)) {
        try {
          pc.addTrack(t, base);
        } catch {
          /* ignore duplicate */
        }
      }
    }
    s.emit(ClientToServerEvents.WEBRTC_READY, { sessionId: sessionIdRef.current });
  }, [ensurePc]);

  React.useEffect(() => {
    if (!signalingReady) return;
    if (!voiceActive && !cameraActive && !screenActive) return;
    syncLocalTracksToPc();
  }, [signalingReady, voiceActive, cameraActive, screenActive, syncLocalTracksToPc]);

  React.useEffect(() => {
    if (!socket || !roomSubscribed) return;

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
      const pc = pcRef.current;
      const endOfCandidates = cand == null || (typeof cand.candidate === "string" && cand.candidate.length === 0);
      if (endOfCandidates) {
        if (!pc?.remoteDescription) return;
        void pc.addIceCandidate(null).catch(() => {});
        return;
      }
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
  }, [socket, roomSubscribed, sessionId, remoteUserId, handleRemoteOffer, handleRemoteAnswer]);

  React.useEffect(() => {
    const mediaOn = voiceActive || cameraActive || screenActive;
    if (!polite || !peerReady || !mediaOn || !signalingReady) return;
    const pc = pcRef.current;
    if (!pc || pc.remoteDescription) return;
    void sendPoliteOffer();
  }, [polite, peerReady, voiceActive, cameraActive, screenActive, signalingReady, sendPoliteOffer]);

  const stopVoice = React.useCallback(() => {
    setVoiceActive(false);
    voiceActiveRef.current = false;
    teardownPc();
    setLastError(null);
  }, [teardownPc]);

  const stopCamera = React.useCallback(() => {
    setCameraActive(false);
    cameraActiveRef.current = false;
    teardownPc();
    setLastError(null);
  }, [teardownPc]);

  const startVoice = React.useCallback(async () => {
    setLastError(null);
    try {
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      const base = localStreamRef.current ?? new MediaStream();
      localStreamRef.current = base;
      for (const t of mic.getAudioTracks()) {
        base.addTrack(t);
      }
      setLocalPreviewStream(new MediaStream(base.getTracks()));
      setVoiceActive(true);
      voiceActiveRef.current = true;

      if (signalingReadyRef.current && socketRef.current?.connected) {
        const pc = ensurePc();
        for (const t of mic.getAudioTracks()) {
          if (!pc.getSenders().some((sender) => sender.track === t)) pc.addTrack(t, base);
        }
        socketRef.current.emit(ClientToServerEvents.WEBRTC_READY, { sessionId: sessionIdRef.current });
        if (pendingOfferSdpRef.current) {
          const sdp = pendingOfferSdpRef.current;
          pendingOfferSdpRef.current = null;
          await handleRemoteOffer(sdp);
        } else if (polite && peerReadyRef.current) {
          await sendPoliteOffer();
        }
      } else {
        setLastError(
          "Waiting for peer — local mic only. Run `npm run dev:realtime` (or deploy the socket server) to connect with your partner.",
        );
      }
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Microphone permission denied");
    }
  }, [ensurePc, handleRemoteOffer, sendPoliteOffer, polite]);

  const startCamera = React.useCallback(async () => {
    setLastError(null);
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const base = localStreamRef.current ?? new MediaStream();
      localStreamRef.current = base;
      for (const t of cam.getVideoTracks()) {
        base.addTrack(t);
      }
      setLocalPreviewStream(new MediaStream(base.getTracks()));
      setCameraActive(true);
      cameraActiveRef.current = true;

      if (signalingReadyRef.current && socketRef.current?.connected) {
        const pc = ensurePc();
        for (const t of cam.getVideoTracks()) {
          if (!pc.getSenders().some((sender) => sender.track === t)) pc.addTrack(t, base);
        }
        socketRef.current.emit(ClientToServerEvents.WEBRTC_READY, { sessionId: sessionIdRef.current });
        if (pendingOfferSdpRef.current) {
          const sdp = pendingOfferSdpRef.current;
          pendingOfferSdpRef.current = null;
          await handleRemoteOffer(sdp);
        } else if (polite && peerReadyRef.current) {
          await sendPoliteOffer();
        }
      } else {
        setLastError(
          "Waiting for peer — local camera only. Connect realtime to share video with your partner.",
        );
      }
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Camera permission denied");
    }
  }, [ensurePc, handleRemoteOffer, sendPoliteOffer, polite]);

  const toggleCamera = React.useCallback(() => {
    if (cameraActive) stopCamera();
    else void startCamera();
  }, [cameraActive, stopCamera, startCamera]);

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
      const liveNoPc = localStreamRef.current?.getTracks().filter((t) => t.readyState === "live") ?? [];
      if (liveNoPc.length) {
        const fresh = new MediaStream(liveNoPc);
        localStreamRef.current = fresh;
        setLocalPreviewStream(fresh);
      } else {
        setLocalPreviewStream(null);
        localStreamRef.current = null;
      }
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
    const live = localStreamRef.current?.getTracks().filter((t) => t.readyState === "live") ?? [];
    if (live.length) {
      const fresh = new MediaStream(live);
      localStreamRef.current = fresh;
      setLocalPreviewStream(fresh);
    } else {
      setLocalPreviewStream(null);
      localStreamRef.current = null;
    }
  }, []);

  const startScreen = React.useCallback(async () => {
    setLastError(null);
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { max: 30 } },
        audio: true,
      });
      const base = localStreamRef.current ?? new MediaStream();
      localStreamRef.current = base;

      if (!signalingReadyRef.current || !socketRef.current?.connected) {
        for (const t of display.getTracks()) {
          t.stop();
        }
        setLastError(
          "Waiting for peer — screen share needs the socket server. Run `npm run dev:realtime` or deploy the socket host.",
        );
        return;
      }

      const pc = ensurePc();
      const senders: RTCRtpSender[] = [];
      for (const t of display.getTracks()) {
        base.addTrack(t);
        const sender = pc.addTrack(t, base);
        senders.push(sender);
        t.addEventListener("ended", () => {
          stopScreen();
        });
      }
      setLocalPreviewStream(new MediaStream(base.getTracks()));
      screenSendersRef.current = senders;
      setScreenActive(true);
      screenActiveRef.current = true;
      socketRef.current!.emit(ClientToServerEvents.WEBRTC_READY, { sessionId: sessionIdRef.current });
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Screen sharing was cancelled or blocked");
    }
  }, [ensurePc, stopScreen]);

  const toggleScreen = React.useCallback(() => {
    if (screenActive) stopScreen();
    else void startScreen();
  }, [screenActive, stopScreen, startScreen]);

  return {
    voiceActive,
    screenActive,
    cameraActive,
    peerReady,
    remoteStream,
    localPreviewStream,
    pcState,
    lastError,
    setLastError,
    toggleVoice,
    toggleCamera,
    toggleScreen,
    stopVoice,
  };
}
