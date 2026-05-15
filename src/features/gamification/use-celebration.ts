"use client";

import { useCallback, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export function useCelebration() {
  const reduced = useReducedMotion();
  const fired = useRef(false);

  return useCallback(
    (kind: "achievement" | "success" = "success") => {
      if (reduced || fired.current) return;
      fired.current = true;
      const scalar = kind === "achievement" ? 1.1 : 0.85;
      void confetti({
        particleCount: kind === "achievement" ? 120 : 60,
        spread: 70,
        origin: { y: 0.65, x: 0.5 },
        scalar,
        colors: ["#22d3ee", "#a78bfa", "#f472b6", "#fbbf24"],
      });
      window.setTimeout(() => {
        fired.current = false;
      }, 800);
    },
    [reduced],
  );
}
