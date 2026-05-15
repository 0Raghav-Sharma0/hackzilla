import type { Transition, Variants } from "framer-motion";
import { motionDuration, motionEase } from "@/animations/motion-config";

/** Premium motion: snappy default, slight overshoot on emphasis. */
export const springSnappy: Transition = { type: "spring", stiffness: 400, damping: 30, mass: 0.75 };

export const springSoft: Transition = { type: "spring", stiffness: 260, damping: 26, mass: 0.9 };

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: springSnappy },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04, delayChildren: 0.04 },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  show: { opacity: 1, scale: 1, transition: springSoft },
};

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: motionDuration.base, ease: motionEase } },
  exit: { opacity: 0, y: -6, transition: { duration: motionDuration.fast, ease: "easeIn" } },
};
