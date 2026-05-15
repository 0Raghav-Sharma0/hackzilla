"use client";

import * as React from "react";
import { Eraser, Pencil, Download, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSocketIo } from "@/features/realtime/socket-io-provider";
import { ClientToServerEvents, ServerToClientEvents } from "@/server/socket/events";
import type { WhiteboardStrokePayload } from "@/server/socket/events";
import { cn } from "@/lib/utils";

type Stroke = WhiteboardStrokePayload["stroke"];

const COLORS = ["#38bdf8", "#a78bfa", "#f472b6", "#fbbf24", "#34d399"];

export function SessionWhiteboard({
  sessionId,
  readOnly,
}: {
  sessionId: string;
  /** When session is not live, drawing is disabled. */
  readOnly: boolean;
}) {
  const { socket, connected } = useSocketIo();
  const fullscreenRootRef = React.useRef<HTMLDivElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = React.useState<Stroke[]>([]);
  const [draft, setDraft] = React.useState<Stroke | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [colorIdx, setColorIdx] = React.useState(0);
  const drawing = React.useRef(false);

  const redraw = React.useCallback((list: Stroke[], partial: Stroke | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wrap = wrapRef.current;
    const rect = wrap?.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect?.width ?? 320));
    const rectH = rect?.height ?? 0;
    const h =
      rectH > 96 ? Math.max(1, Math.floor(rectH)) : Math.max(1, Math.floor((rect?.width ?? 320) * 0.55));
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio ?? 1 : 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* Canvas does not resolve CSS `var()` in fillStyle — literal white “paper” in all themes */
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const paint = (stroke: Stroke) => {
      if (stroke.points.length < 2) return;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    };
    for (const s of list) paint(s);
    if (partial) paint(partial);
  }, []);

  React.useLayoutEffect(() => {
    redraw(strokes, draft);
  }, [strokes, draft, redraw, isFullscreen]);

  React.useEffect(() => {
    const fn = () => redraw(strokes, draft);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [redraw, strokes, draft]);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => redraw(strokes, draft));
    ro.observe(el);
    return () => ro.disconnect();
  }, [redraw, strokes, draft]);

  React.useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === fullscreenRootRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    const el = fullscreenRootRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      /* Safari / embedded frames may block fullscreen */
    }
  }

  React.useEffect(() => {
    if (!socket?.connected) return;
    const onRemoteStroke = (p: WhiteboardStrokePayload) => {
      if (p.sessionId !== sessionId) return;
      setStrokes((prev) => [...prev, p.stroke]);
    };
    const onRemoteClear = (p: { sessionId: string }) => {
      if (p.sessionId !== sessionId) return;
      setStrokes([]);
      setDraft(null);
    };
    socket.on(ServerToClientEvents.WB_STROKE, onRemoteStroke);
    socket.on(ServerToClientEvents.WB_CLEAR, onRemoteClear);
    return () => {
      socket.off(ServerToClientEvents.WB_STROKE, onRemoteStroke);
      socket.off(ServerToClientEvents.WB_CLEAR, onRemoteClear);
    };
  }, [socket, sessionId, socket?.connected]);

  function clientPoint(ev: React.PointerEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  function onPointerDown(ev: React.PointerEvent<HTMLCanvasElement>) {
    if (readOnly) return;
    ev.currentTarget.setPointerCapture(ev.pointerId);
    const p = clientPoint(ev);
    drawing.current = true;
    setDraft({
      id: crypto.randomUUID(),
      color: COLORS[colorIdx % COLORS.length],
      width: 2.4,
      points: [p],
    });
  }

  function onPointerMove(ev: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || readOnly || !draft) return;
    const p = clientPoint(ev);
    setDraft((d) => (d ? { ...d, points: [...d.points, p] } : d));
  }

  function onPointerUp(ev: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !draft) return;
    drawing.current = false;
    try {
      ev.currentTarget.releasePointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
    const finished = { ...draft, points: draft.points };
    if (finished.points.length >= 2) {
      setStrokes((prev) => [...prev, finished]);
      if (socket?.connected) {
        socket.emit(ClientToServerEvents.WB_STROKE, { sessionId, stroke: finished } satisfies WhiteboardStrokePayload);
      }
    }
    setDraft(null);
  }

  function clearBoard() {
    setStrokes([]);
    setDraft(null);
    if (socket?.connected) {
      socket.emit(ClientToServerEvents.WB_CLEAR, { sessionId });
    }
  }

  function downloadPng() {
    redraw(strokes, draft);
    requestAnimationFrame(() => {
      const c = canvasRef.current;
      if (!c) return;
      const a = document.createElement("a");
      a.download = `whiteboard-${sessionId.slice(0, 8)}.png`;
      a.href = c.toDataURL("image/png");
      a.click();
    });
  }

  return (
    <div
      ref={fullscreenRootRef}
      className={cn(
        "flex min-h-0 w-full min-w-0 flex-col gap-2",
        isFullscreen && "box-border min-h-screen bg-background p-3 sm:p-5",
      )}
    >
      <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2">
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border/60 bg-muted/20 p-1">
          <Pencil className="mx-1 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          {COLORS.map((c, i) => (
            <button
              key={c}
              type="button"
              disabled={readOnly}
              aria-label={`Color ${i + 1}`}
              className={cn(
                "h-6 w-6 rounded-md border-2 transition-transform",
                colorIdx === i ? "scale-110 border-primary" : "border-transparent opacity-80 hover:opacity-100",
              )}
              style={{ backgroundColor: c }}
              onClick={() => setColorIdx(i)}
            />
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={toggleFullscreen}>
          {isFullscreen ? (
            <>
              <Minimize2 className="mr-1.5 h-3.5 w-3.5" />
              Exit
            </>
          ) : (
            <>
              <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
              Fullscreen
            </>
          )}
        </Button>
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={downloadPng}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          PNG
        </Button>
        <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={readOnly} onClick={clearBoard}>
          <Eraser className="mr-1.5 h-3.5 w-3.5" />
          Clear
        </Button>
        <span
          className="w-full min-w-0 text-[11px] leading-snug text-muted-foreground sm:w-auto sm:max-w-[14rem] sm:truncate"
          title={!connected ? "Drawing stays on this device until you run npm run dev:realtime." : "Strokes sync live over the socket server."}
        >
          {!connected ? "Local strokes only — start dev:realtime to sync." : "Live sync on"}
        </span>
      </div>
      <div
        ref={wrapRef}
        className={cn(
          "relative w-full min-w-0 overflow-hidden rounded-xl border border-border/70 bg-white dark:bg-muted/25",
          isFullscreen ? "min-h-0 flex-1" : "aspect-[5/3] max-h-[min(52vh,420px)]",
        )}
      >
        <canvas
          ref={canvasRef}
          className={cn(
            "absolute inset-0 h-full w-full touch-none",
            readOnly ? "cursor-default opacity-90" : "cursor-crosshair",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
    </div>
  );
}
