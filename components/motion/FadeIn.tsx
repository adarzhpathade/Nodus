"use client";
// Fade + slide in on mount or when scrolled into view.
// Reduced motion: <MotionConfig reducedMotion="user"> (app/providers.tsx) drops the slide and keeps the fade.
import { motion, type HTMLMotionProps } from "motion/react";
import { distance as distances, duration as durations, ease } from "./tokens";

type Direction = "up" | "down" | "left" | "right" | "none";

const offset = (direction: Direction, amount: number) => {
  switch (direction) {
    case "up":
      return { y: amount };
    case "down":
      return { y: -amount };
    case "left":
      return { x: amount };
    case "right":
      return { x: -amount };
    default:
      return {};
  }
};

type FadeInProps = HTMLMotionProps<"div"> & {
  direction?: Direction;
  distance?: number;
  delay?: number;
  duration?: number;
  /** Animate when scrolled into view instead of on mount. */
  inView?: boolean;
  /** Only animate the first time it enters the viewport. */
  once?: boolean;
};

export function FadeIn({
  direction = "up",
  distance = distances.md,
  delay = 0,
  duration = durations.base,
  inView = false,
  once = true,
  children,
  ...props
}: FadeInProps) {
  const hidden = { opacity: 0, ...offset(direction, distance) };
  const shown = { opacity: 1, x: 0, y: 0 };
  const transition = { duration, delay, ease: ease.outExpo };

  return (
    <motion.div
      initial={hidden}
      {...(inView
        ? { whileInView: shown, viewport: { once, amount: 0.2 } }
        : { animate: shown })}
      transition={transition}
      {...props}
    >
      {children}
    </motion.div>
  );
}
