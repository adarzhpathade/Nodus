"use client";
// GSAP helper (FE-1.4). Wraps `useGSAP` so every tween/timeline/ScrollTrigger created inside
// `setup` is scoped to `scope` and reverted on unmount (no leaking ScrollTriggers).
// `setup` receives `reducedMotion` so each animation can provide a reduced fallback (FE-1.6),
// and re-runs automatically if the OS setting changes.
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { RefObject } from "react";

gsap.registerPlugin(useGSAP);

export type GsapEnv = { reducedMotion: boolean };

type Options = {
  scope?: RefObject<Element | null>;
  dependencies?: unknown[];
  /** Revert and re-run setup whenever a dependency changes (default: true). */
  revertOnUpdate?: boolean;
};

export function useGsapContext(setup: (env: GsapEnv) => void | (() => void), options: Options = {}) {
  const { scope, dependencies = [], revertOnUpdate = true } = options;

  return useGSAP(
    () => {
      const mm = gsap.matchMedia(scope?.current ?? undefined);
      mm.add(
        { reduce: "(prefers-reduced-motion: reduce)", full: "(prefers-reduced-motion: no-preference)" },
        (context) => setup({ reducedMotion: Boolean(context.conditions?.reduce) }),
      );
      return () => mm.revert();
    },
    { scope, dependencies, revertOnUpdate },
  );
}

/** Lazy-load ScrollTrigger (keeps it out of pages that don't scroll-animate). */
export async function loadScrollTrigger() {
  const { ScrollTrigger } = await import("gsap/ScrollTrigger");
  gsap.registerPlugin(ScrollTrigger);
  return ScrollTrigger;
}

/** Lazy-load SplitText for headline reveals. */
export async function loadSplitText() {
  const { SplitText } = await import("gsap/SplitText");
  gsap.registerPlugin(SplitText);
  return SplitText;
}
