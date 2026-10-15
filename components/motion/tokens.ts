// Motion tokens (AGENTS.md §11.3): every duration, easing and spring lives here.
// PLACEHOLDER values — tuned to the provided design in FE-10.
import type { Transition } from "motion/react";

/** Seconds (Motion + GSAP both use seconds). */
export const duration = {
  instant: 0.12,
  fast: 0.2,
  base: 0.35,
  slow: 0.6,
  slower: 0.9,
  countUp: 1.2,
} as const;

/** Cubic-bezier tuples for Motion; GSAP names for timelines. Keep both in sync with globals.css. */
export const ease = {
  outExpo: [0.16, 1, 0.3, 1],
  inOutQuart: [0.76, 0, 0.24, 1],
  out: [0.33, 1, 0.68, 1],
} as const;

export const gsapEase = {
  outExpo: "expo.out",
  inOutQuart: "quart.inOut",
  out: "power2.out",
} as const;

export const spring = {
  /** Popovers, hover cards, slash menu. */
  pop: { type: "spring", stiffness: 420, damping: 30, mass: 0.8 },
  /** Panels and sheets. */
  panel: { type: "spring", stiffness: 260, damping: 32 },
  /** Gentle layout changes (graph expand/collapse, list reorder). */
  layout: { type: "spring", stiffness: 200, damping: 28 },
  /** Magnetic hover follow. */
  magnetic: { type: "spring", stiffness: 180, damping: 15, mass: 0.4 },
} as const satisfies Record<string, Transition>;

/** Distances in px for enter animations. */
export const distance = {
  sm: 8,
  md: 16,
  lg: 32,
} as const;

/** Delay between children in a stagger, seconds. */
export const stagger = {
  fast: 0.04,
  base: 0.07,
  slow: 0.12,
} as const;

export const lenis = {
  lerp: 0.1,
  wheelMultiplier: 1,
} as const;

export const magnetic = {
  /** 0–1: how far the element follows the pointer. */
  strength: 0.3,
} as const;

/** Standard enter transition. */
export const enter: Transition = { duration: duration.base, ease: ease.outExpo };
