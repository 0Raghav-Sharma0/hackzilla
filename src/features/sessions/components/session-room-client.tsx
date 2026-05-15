"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, MessageSquare, PanelTop, Send, Square, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { endSession, getSessionBundle, sendSessionMessage, requestSessionStart, confirmSessionStart } from "@/features/help-requests/actions";
import { SessionMediaRail } from "@/features/sessions/components/session-media-rail";
import { SessionWhiteboard } from "@/features/sessions/components/session-whiteboard";
import { SessionRatingPanel } from "@/features/sessions/components/session-rating-panel";
import { ReportContentDialog } from "@/features/trust/components/report-content-dialog";
import { useSocketIo } from "@/features/realtime/socket-io-provider";
import { usePageVisible } from "@/features/realtime/use-page-visible";
import { AIShimmer } from "@/features/ai/components/ai-shimmer";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/feedback/empty-state";
import { ClientToServerEvents, ServerToClientEvents } from "@/server/socket/events";
import type { MessageNewEventPayload, SessionLiveChatMessagePayload } from "@/server/socket/events";

type SessionBundle = NonNullable<Awaited<ReturnType<typeof getSessionBundle>>>;

export function SessionRoomClient(props: {
  sessionId: string;
  initialBundle?: Awaited<ReturnType<typeof getSessionBundle>>;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return (
      <div className="mx-auto w-full max-w-full space-y-4 px-1 sm:px-0">
        <AIShimmer className="h-36 w-full rounded-2xl sm:h-40" />
        <AIShimmer className="h-72 w-full rounded-2xl sm:h-64" />
      </div>
    );
  }
  return <SessionRoomInner {...props} />;
}

type SessionMessage = SessionBundle["messages"][number] & {
  pending?: boolean;
  clientMessageId?: string;
};

function mergeIncomingMessage(prev: SessionBundle | undefined, incoming: SessionLiveChatMessagePayload | SessionMessage) {
  if (!prev?.viewerId) return prev;
  if (prev.messages.some((m) => m.id === incoming.id)) return prev;

  const isMine = incoming.senderId === prev.viewerId;
  const normalized = { ...incoming, isMine };
  const optimisticIndex = prev.messages.findIndex(
    (m) => (m as SessionMessage).pending && (m as SessionMessage).senderId === incoming.senderId && m.body === incoming.body,
  );

  if (optimisticIndex >= 0) {
    const nextMessages = [...prev.messages];
    nextMessages[optimisticIndex] = normalized;
    return { ...prev, messages: nextMessages };
  }

  return { ...prev, messages: [...prev.messages, normalized] };
}

function SessionRoomInner({
  sessionId,
  initialBundle,
}: {
  sessionId: string;
  initialBundle?: Awaited<ReturnType<typeof getSessionBundle>>;
}) {
  const queryClient = useQueryClient();
  const { socket, connected } = useSocketIo();
  const [body, setBody] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const tRef = React.useRef<number | null>(null);

  const initialMeta = React.useMemo(() => {
    if (initialBundle === undefined) return null;
    if (initialBundle === null) return null;
    return { data: initialBundle, updatedAt: Date.now() };
  }, [initialBundle]);

  const pageVisible = usePageVisible();
  const [sessionSocketSubscribed, setSessionSocketSubscribed] = React.useState(false);
  const pollMsFallback = 4_000;
  const query = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => getSessionBundle(sessionId),
    refetchInterval: (q) => {
      if (!pageVisible) return false;
      const d = q.state.data;
      const live = d?.status === "SCHEDULED" || d?.status === "ACTIVE";
      if (!live) return false;
      return connected ? false : pollMsFallback;
    },
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: connected ? 5 * 60_000 : 30_000,
    gcTime: 1000 * 60 * 60 * 12,
    ...(initialMeta
      ? { initialData: initialMeta.data, initialDataUpdatedAt: initialMeta.updatedAt }
      : {}),
  });

  const sessionLive = query.data?.status === "SCHEDULED" || query.data?.status === "ACTIVE";

  React.useLayoutEffect(() => {
    if (!socket) {
      setSessionSocketSubscribed(false);
      return;
    }
    let cancelled = false;
    const join = () => {
      socket.emit(
        ClientToServerEvents.SESSION_SUBSCRIBE,
        { sessionId },
        (ack: unknown) => {
          if (cancelled) return;
          const ok = typeof ack === "object" && ack !== null && "ok" in ack && (ack as { ok: boolean }).ok === true;
          setSessionSocketSubscribed(ok);
        },
      );
    };
    if (!sessionLive) {
      setSessionSocketSubscribed(false);
      if (socket.connected) {
        socket.emit(ClientToServerEvents.SESSION_UNSUBSCRIBE, { sessionId });
      }
      return () => {
        cancelled = true;
      };
    }
    if (socket.connected) join();
    socket.on("connect", join);
    return () => {
      cancelled = true;
      socket.off("connect", join);
      setSessionSocketSubscribed(false);
      if (socket.connected) {
        socket.emit(ClientToServerEvents.SESSION_UNSUBSCRIBE, { sessionId });
      }
    };
  }, [socket, sessionId, sessionLive]);

  React.useEffect(() => {
    if (!socket || !sessionLive) return;
    const onNew = (payload: MessageNewEventPayload) => {
      if (payload.sessionId !== sessionId) return;
      queryClient.setQueryData<SessionBundle>(["session", sessionId], (prev) => mergeIncomingMessage(prev, payload.message));
    };
    socket.on(ServerToClientEvents.MESSAGE_NEW, onNew);
    return () => {
      socket.off(ServerToClientEvents.MESSAGE_NEW, onNew);
    };
  }, [socket, sessionId, queryClient, sessionLive]);

  React.useEffect(() => {
    if (!socket || !sessionLive) return;
    const onStarted = (payload: { sessionId?: string }) => {
      if (payload?.sessionId !== sessionId) return;
      toast.success("Session timer started.");
    };
    socket.on(ServerToClientEvents.SESSION_STARTED, onStarted);
    return () => {
      socket.off(ServerToClientEvents.SESSION_STARTED, onStarted);
    };
  }, [socket, sessionId, sessionLive]);

  const send = useMutation({
    mutationFn: ({ body: messageBody, clientMessageId }: { body: string; clientMessageId: string }) =>
      sendSessionMessage({ sessionId, body: messageBody, clientMessageId }),
    onMutate: async ({ body: messageBody, clientMessageId }) => {
      const prevBundle = queryClient.getQueryData<SessionBundle>(["session", sessionId]);
      const live = prevBundle?.status === "SCHEDULED" || prevBundle?.status === "ACTIVE";
      if (!live) return { clientMessageId };
      const optimisticBody = messageBody.trim();
      if (!optimisticBody) return { clientMessageId };
      queryClient.setQueryData<SessionBundle>(["session", sessionId], (prev) => {
        if (!prev?.viewerId) return prev;
        const optimisticMessage = {
          id: clientMessageId,
          clientMessageId,
          body: optimisticBody,
          createdAt: new Date().toISOString(),
          senderId: prev.viewerId,
          senderName: "You",
          isMine: true,
          pending: true,
        } as SessionMessage;
        if (prev.messages.some((m) => m.id === clientMessageId)) return prev;
        return { ...prev, messages: [...prev.messages, optimisticMessage] };
      });
      return { clientMessageId };
    },
    onSuccess: (res, _vars, ctx) => {
      setBody("");
      if (res.message) {
        queryClient.setQueryData<SessionBundle>(["session", sessionId], (prev) => {
          if (!prev?.viewerId) return prev;
          const finalMessage = { ...res.message!, isMine: true } as SessionMessage;
          const nextMessages = prev.messages
            .map((m) => ((ctx?.clientMessageId && (m as SessionMessage).clientMessageId === ctx.clientMessageId) ? finalMessage : m))
            .filter((m, index, all) => all.findIndex((candidate) => candidate.id === m.id) === index);
          if (nextMessages.some((m) => m.id === finalMessage.id)) return { ...prev, messages: nextMessages };
          return { ...prev, messages: [...nextMessages, finalMessage] };
        });
      } else {
        void query.refetch();
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const end = useMutation({
    mutationFn: () => endSession(sessionId),
    onSuccess: () => {
      toast.success("Session ended.");
      void query.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const requestStart = useMutation({
    mutationFn: () => requestSessionStart(sessionId),
    onSuccess: () => {
      toast.success("Learner notified — waiting for them to start the timer.");
      void query.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmStart = useMutation({
    mutationFn: () => confirmSessionStart(sessionId),
    onSuccess: () => {
      void query.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = query.data;
  const elapsed = useElapsed(data?.startedAt, data?.status === "ACTIVE");
  const isActive = data?.status === "ACTIVE";
  const isScheduled = data?.status === "SCHEDULED";
  const submitMessage = React.useCallback(() => {
    if (!sessionLive) return;
    const messageBody = body.trim();
    if (!messageBody || send.isPending) return;
    void send.mutateAsync({ body: messageBody, clientMessageId: crypto.randomUUID() });
  }, [body, send, sessionLive]);

  if (query.isLoading) {
    return (
      <div className="mx-auto w-full max-w-full space-y-4 px-1 sm:px-0">
        <AIShimmer className="h-36 w-full rounded-2xl sm:h-40" />
        <AIShimmer className="h-72 w-full rounded-2xl sm:h-64" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="mx-auto max-w-lg px-2">
        <EmptyState
          icon={AlertCircle}
          title="Session unavailable"
          description="We couldn’t load this room. Your link may be stale, or the network dropped mid-request."
        >
          <Button type="button" variant="glow" onClick={() => void query.refetch()} disabled={query.isFetching}>
            {query.isFetching ? "Retrying…" : "Retry"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/sessions">All sessions</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (query.isSuccess && !data) {
    return (
      <div className="mx-auto max-w-lg px-2">
        <EmptyState
          icon={MessageSquare}
          title="Session not found"
          description="You may not have access, or this room was archived after completion."
        >
          <Button variant="glow" asChild>
            <Link href="/dashboard/sessions">Back to sessions</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-0 min-w-0 w-full max-w-full flex-col gap-4 overflow-x-hidden lg:flex-row lg:items-stretch lg:gap-6">
      <div className="flex min-h-0 min-w-0 max-h-[85dvh] flex-1 flex-col rounded-2xl border-2 border-border bg-card shadow-sm lg:max-h-[calc(100dvh-7rem)] lg:max-w-lg xl:max-w-xl">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-primary">Session</p>
            <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug sm:line-clamp-3">{data.requestTitle}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <ReportContentDialog target={{ targetType: "SESSION", targetId: sessionId }} label="Report" />
            <Badge variant={data.status === "ACTIVE" ? "glow" : "secondary"} className="whitespace-nowrap">
              {data.status}
            </Badge>
          </div>
        </div>
        <SessionMediaRail
          className="mx-3 mt-2"
          sessionOpen={sessionLive}
          sessionId={sessionId}
          sessionSubscribed={sessionSocketSubscribed}
          viewerId={data.viewerId}
          peerUserId={data.viewerId === data.tutor.id ? data.student.id : data.tutor.id}
        />
        <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span className="font-mono tabular-nums">{formatElapsed(elapsed)}</span>
          {!sessionLive ? (
            <span className="ml-auto text-muted-foreground">Session ended</span>
          ) : !isActive && isScheduled ? (
            <span className="ml-auto text-muted-foreground">Waiting to start</span>
          ) : typing ? (
            <span className="ml-auto animate-pulse text-primary">Someone is typing…</span>
          ) : connected ? (
            <span className="ml-auto font-medium text-green-800 dark:text-green-400/90">Live chat</span>
          ) : (
            <span className="ml-auto opacity-60">Syncing…</span>
          )}
        </div>
        <ScrollArea className="min-h-[220px] min-w-0 flex-1 basis-0 px-3">
          <div className="space-y-2 py-3">
            <AnimatePresence initial={false}>
              {data.messages.map((m) => (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "max-w-[90%] rounded-2xl border-2 px-3 py-2 text-sm",
                    m.isMine
                      ? "ml-auto rounded-tr-none border border-primary/35 bg-primary/15 text-foreground shadow-sm dark:bg-primary/22"
                      : "rounded-tl-none border-2 border-border bg-card",
                  )}
                >
                  <p
                    className={cn(
                      "text-[10px] font-medium uppercase tracking-wide",
                      m.isMine ? "text-primary/85" : "text-muted-foreground",
                    )}
                  >
                    {m.senderName}
                  </p>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <Input
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setTyping(true);
                if (tRef.current) window.clearTimeout(tRef.current);
                tRef.current = window.setTimeout(() => setTyping(false), 700);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitMessage();
                }
              }}
              placeholder={sessionLive ? "Message…" : "Chat closed for this session"}
              className="bg-background/50"
              disabled={!sessionLive}
            />
            <Button size="icon" variant="glow" disabled={!sessionLive || !body.trim() || send.isPending} onClick={submitMessage}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-[1.2] flex-col gap-4 lg:min-h-0 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1">
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <Card className="min-w-0 overflow-hidden border-2 border-border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <PanelTop className="h-4 w-4 shrink-0 text-primary" />
                Whiteboard
              </CardTitle>
            </CardHeader>
            <CardContent className="min-w-0 px-4 pb-4 pt-0">
              <SessionWhiteboard
                sessionId={sessionId}
                readOnly={data.status !== "SCHEDULED" && data.status !== "ACTIVE"}
                socketSubscribed={sessionSocketSubscribed}
              />
            </CardContent>
          </Card>
          <Card className="min-w-0 overflow-hidden border-2 border-border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-primary" />
                Session tips
              </CardTitle>
            </CardHeader>
            <CardContent className="min-w-0 space-y-3 break-words text-sm text-muted-foreground">
              <p>Use the chat for quick explanations and the whiteboard for sketches, step-by-step work, or diagrams.</p>
              {data.viewerId === data.student.id ? (
                <p className="text-xs">
                  When you finish, rate the session. A flat session fee is debited from your wallet when you submit
                  your rating; your tutor’s credit is based on stars (the two amounts are unrelated).
                </p>
              ) : (
                <p className="text-xs">
                  When the learner ends and rates, their session fee and your payout are calculated separately.
                </p>
              )}
              {data.status === "ENDED" && data.tutorSessionPayoutMicrocredits ? (
                <p className="rounded-md border border-border bg-muted px-2 py-1.5 text-xs text-foreground/90">
                  {data.viewerId === data.tutor.id ? (
                    <>
                      <span className="font-semibold text-primary">Your payout from this session: </span>
                      {formatMicroCreditsLabel(data.tutorSessionPayoutMicrocredits)} (based on the learner’s star
                      rating).
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-primary">Tutor payout: </span>
                      {formatMicroCreditsLabel(data.tutorSessionPayoutMicrocredits)} credited to your tutor after
                      your rating.
                      <span className="mt-1 block text-muted-foreground">
                        Session fee from your wallet: {formatMicroCreditsLabel(data.studentSessionFeeMicrocredits)}{" "}
                        (charged when you submit your rating).
                      </span>
                    </>
                  )}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {data.viewerId === data.student.id && (data.viewerCanRate || data.sessionRating != null) ? (
          <SessionRatingPanel
            sessionId={sessionId}
            viewerCanRate={data.viewerCanRate}
            sessionRatingStars={data.sessionRating?.stars ?? null}
          />
        ) : null}

        <Card className="min-w-0 shrink-0 border-2 border-border bg-card shadow-sm">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Controls
            </CardTitle>
            <p className="text-xs font-normal text-muted-foreground">
              The tutor asks to begin; the learner starts the timer. Close session is available once the session is
              live.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {isScheduled ? (
              <div className="space-y-3 rounded-lg border border-border/80 bg-muted/30 p-3 text-sm">
                {data.canRequestSessionStart ? (
                  <div className="space-y-2">
                    <p className="text-muted-foreground">When you and your learner are ready, ask them to start the timer.</p>
                    <Button
                      type="button"
                      variant="glow"
                      className="w-full sm:w-auto"
                      disabled={requestStart.isPending}
                      onClick={() => void requestStart.mutateAsync()}
                    >
                      {requestStart.isPending ? "Sending…" : "Ask learner to start"}
                    </Button>
                  </div>
                ) : null}
                {data.viewerId === data.tutor.id && !data.canRequestSessionStart && data.startRequestedAt ? (
                  <p className="text-muted-foreground">Waiting for the learner to confirm and start the timer…</p>
                ) : null}
                {data.canConfirmSessionStart ? (
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Your tutor is ready.</p>
                    <p className="text-xs text-muted-foreground">Tap below when you want the session clock to begin.</p>
                    <Button
                      type="button"
                      variant="default"
                      className="w-full gap-2 sm:w-auto"
                      disabled={confirmStart.isPending}
                      onClick={() => void confirmStart.mutateAsync()}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {confirmStart.isPending ? "Starting…" : "Start session"}
                    </Button>
                  </div>
                ) : null}
                {data.viewerId === data.student.id && !data.canConfirmSessionStart && !data.startRequestedAt ? (
                  <p className="text-sm text-muted-foreground">Your tutor will ask you to start when you are both ready.</p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {isActive ? (
                <Button
                  variant="destructive"
                  className="w-full sm:w-auto"
                  onClick={() => void end.mutateAsync()}
                  disabled={end.isPending}
                >
                  <Square className="mr-2 h-4 w-4" />
                  Close session
                </Button>
              ) : null}
              {isScheduled ? (
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => void end.mutateAsync()}
                  disabled={end.isPending}
                >
                  Cancel session
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function useElapsed(startedAt: string | null | undefined, active: boolean) {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!active || !startedAt) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [active, startedAt]);
  if (!startedAt || !active) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
}

function formatElapsed(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatMicroCreditsLabel(micro: string) {
  const n = Number(BigInt(micro)) / 1_000_000;
  if (!Number.isFinite(n)) return "—";
  if (n >= 10) return `~${n.toFixed(0)} credits`;
  if (n >= 1) return `~${n.toFixed(1)} credits`;
  return `~${n.toFixed(2)} credits`;
}
