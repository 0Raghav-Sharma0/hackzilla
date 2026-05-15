"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const LABELS = ["Subject fit", "Pedagogy", "Pace", "Clarity", "Availability"] as const;

/** Five-axis “compatibility” — values are presentation-only for demo. */
export function AISkillRadar({
  values,
  className,
}: {
  values: readonly [number, number, number, number, number];
  className?: string;
}) {
  const n = LABELS.length;
  const cx = 50;
  const cy = 52;
  const maxR = 38;
  const pts = values.map((v, i) => {
    const t = (-Math.PI / 2 + (i * 2 * Math.PI) / n) as number;
    const r = (Math.min(100, Math.max(0, v)) / 100) * maxR;
    return `${cx + r * Math.cos(t)},${cy + r * Math.sin(t)}`;
  });
  const d = `M ${pts.join(" L ")} Z`;

  return (
    <div className={cn("relative", className)}>
      <svg viewBox="0 0 100 100" className="h-40 w-full text-primary/20" aria-hidden>
        {[0.25, 0.5, 0.75, 1].map((s) => (
          <polygon
            key={s}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.35}
            points={LABELS.map((_, i) => {
              const t = (-Math.PI / 2 + (i * 2 * Math.PI) / n) as number;
              return `${cx + maxR * s * Math.cos(t)},${cy + maxR * s * Math.sin(t)}`;
            }).join(" ")}
          />
        ))}
        {LABELS.map((_, i) => {
          const t = (-Math.PI / 2 + (i * 2 * Math.PI) / n) as number;
          return <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(t)} y2={cy + maxR * Math.sin(t)} stroke="currentColor" strokeWidth={0.35} />;
        })}
      </svg>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-40 w-full overflow-visible">
        <defs>
          <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <motion.path
          d={d}
          fill="url(#radarFill)"
          className="stroke-primary"
          strokeWidth={1.2}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
      </svg>
      <div className="mt-1 grid grid-cols-5 gap-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
        {LABELS.map((l, i) => (
          <span key={l} className="text-center leading-tight">
            {l}
            <span className="mt-0.5 block font-mono text-[10px] text-foreground">{values[i]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
