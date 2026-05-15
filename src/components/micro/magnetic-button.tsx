"use client";

import * as React from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

/** Subtle magnetic pull — inner native `<button>` avoids Framer / HTML event type clashes. */
export function MagneticButton({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });
  const transform = useMotionTemplate`translateX(${sx}px) translateY(${sy}px)`;

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    x.set(dx * 0.08);
    y.set(dy * 0.08);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.span style={{ transform }} className="inline-flex">
      <button
        ref={ref}
        {...props}
        type={props.type ?? "button"}
        className={cn("inline-flex", className)}
        onMouseMove={(e) => {
          props.onMouseMove?.(e);
          handleMove(e);
        }}
        onMouseLeave={(e) => {
          props.onMouseLeave?.(e);
          reset();
        }}
      >
        {children}
      </button>
    </motion.span>
  );
}
