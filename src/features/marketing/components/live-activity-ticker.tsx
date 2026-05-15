"use client";

import * as React from "react";
import { motion } from "framer-motion";

const EVENTS = [
  "Riley · Harbor Poly matched on linear algebra",
  "Morgan · Riverside Tech started a whiteboard session",
  "Casey earned +120 credits · streak 9d",
  "Jordan posted a high-urgency calculus doubt",
  "Priya · Summit State joined the campus leaderboard top 5",
  "Dev · Northline U accepted a physics help request",
  "AI tagged 14 new doubts in the last hour",
  "Sam completed session recap · CS fundamentals",
  "Campus rivalry: Harbor Poly closed the gap by 40 pts",
  "Avery unlocked “Week streak” achievement",
];

export function LiveActivityTicker() {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const id = window.setInterval(() => setI((v) => (v + 1) % EVENTS.length), 4200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] py-2.5">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
      <motion.p
        key={EVENTS[i]}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.45 }}
        className="px-6 text-center text-xs font-medium text-emerald-200/90 sm:text-sm"
      >
        <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        {EVENTS[i]}
      </motion.p>
    </div>
  );
}
