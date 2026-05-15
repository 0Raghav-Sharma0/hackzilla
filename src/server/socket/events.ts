/**
 * Socket.IO event contracts — WHY: Single source of truth shared by Next token route + socket server.
 * Transport: JSON-serializable payloads only.
 */

export const SocketNamespaces = {
  /** Default application namespace — WHY: isolate from admin/monitoring namespaces later. */
  default: "/",
} as const;

export const ClientToServerEvents = {
  /** Subscribe to a help-request lobby for interest counts + typing. */
  REQUEST_SUBSCRIBE: "request:subscribe",
  REQUEST_UNSUBSCRIBE: "request:unsubscribe",
  REQUEST_SIGNAL_INTEREST: "request:signal_interest",
  REQUEST_TYPING: "request:typing",

  SESSION_SUBSCRIBE: "session:subscribe",
  SESSION_UNSUBSCRIBE: "session:unsubscribe",
  /** Collaborative session whiteboard — relayed to peers in the same session room. */
  WB_STROKE: "wb:stroke",
  WB_CLEAR: "wb:clear",
  MESSAGE_SEND: "message:send",
  MESSAGE_TYPING: "message:typing",

  PRESENCE_HEARTBEAT: "presence:heartbeat",

  NOTIFICATION_ACK: "notification:ack",
} as const;

export const ServerToClientEvents = {
  REQUEST_CREATED: "request:created",
  REQUEST_UPDATED: "request:updated",
  REQUEST_INTEREST: "request:interest",
  TUTOR_MATCHED: "tutor:matched",

  NOTIFICATION_NEW: "notification:new",

  SESSION_STARTED: "session:started",
  SESSION_ENDED: "session:ended",
  SESSION_STATE: "session:state",

  MESSAGE_NEW: "message:new",
  TYPING: "typing:update",

  PRESENCE_ONLINE: "presence:online",
  PRESENCE_OFFLINE: "presence:offline",

  DASHBOARD_STATS: "dashboard:stats",

  /** Push TanStack Query invalidation keys to connected dashboards. */
  RT_INVALIDATE: "rt:invalidate",
  WB_STROKE: "wb:stroke",
  WB_CLEAR: "wb:clear",
} as const;

/** Example payload shapes — mirror in Zod on the socket server ingress. */
export type RequestSubscribePayload = { requestId: string };
export type SessionSubscribePayload = { sessionId: string };
export type RequestSignalInterestPayload = { requestId: string };
export type MessageSendPayload = {
  sessionId: string;
  clientMessageId: string;
  body: string;
};
export type PresenceHeartbeatPayload = { status: "ONLINE" | "AWAY" | "BUSY" };

export type RequestCreatedPayload = {
  requestId: string;
  authorId: string;
  subjectSlug: string;
  title: string;
  createdAt: string;
};

export type NotificationNewPayload = {
  notificationId: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
};

export type WhiteboardStrokePayload = {
  sessionId: string;
  stroke: { id: string; color: string; width: number; points: { x: number; y: number }[] };
};

/** Pushed to `session:{sessionId}` after Prisma insert — clients merge without refetch. */
export type SessionLiveChatMessagePayload = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  senderName: string;
};

export type MessageNewEventPayload = {
  sessionId: string;
  message: SessionLiveChatMessagePayload;
};

export type SessionStartedPayload = { sessionId: string };
