"use client";
// Staggered reveal: <Stagger> wraps a list, each child is a <StaggerItem>.
import { motion, type HTMLMotionProps, type Variants } from "motion/react";
import { distance, duration, ease, stagger as staggerTokens } from "./tokens";

type StaggerProps = HTMLMotionProps<"div"> & {
  /** Seconds between children. */
  stagger?: number;
  delay?: number;
  /** Start when scrolled into view instead of on mount. */
  inView?: boolean;
};

export function Stagger({ stagger = staggerTokens.base, delay = 0, inView = false, children, ...props }: StaggerProps) {
  const variants: Variants = {
    hidden: {},
    shown: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      {...(inView ? { whileInView: "shown", viewport: { once: true, amount: 0.15 } } : { animate: "shown" })}
      {...props}
    >
      {children}
    </motion.div>
  );
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: distance.md },
  shown: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.outExpo } },
};

export function StaggerItem({ children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={itemVariants} {...props}>
      {children}
    </motion.div>
  );
}
