"use client";
// Lenis smooth scroll synced with GSAP ScrollTrigger (FE-1.5).
// Opt-in per page/layout (landing + long pages) — not global, because smooth scrolling fights the
// graph canvas, editor and inner scroll panels. Reduced motion: native scrolling, no Lenis.
import { ReactLenis, type LenisRef } from "lenis/react";
import "lenis/dist/lenis.css";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { lenis as lenisTokens } from "./tokens";

export { useLenis } from "lenis/react";

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    let cleanup = () => {};

    // GSAP's ticker drives Lenis so ScrollTrigger and Lenis share one frame loop.
    (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      const lenis = lenisRef.current?.lenis;
      if (cancelled || !lenis) return;

      gsap.registerPlugin(ScrollTrigger);
      const tick = (time: number) => lenis.raf(time * 1000);
      const unsubscribe = lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      ScrollTrigger.refresh();

      cleanup = () => {
        unsubscribe();
        gsap.ticker.remove(tick);
        gsap.ticker.lagSmoothing(500, 33);
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [reducedMotion]);

  if (reducedMotion) return <>{children}</>;

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{ autoRaf: false, lerp: lenisTokens.lerp, wheelMultiplier: lenisTokens.wheelMultiplier }}
    >
      {children}
    </ReactLenis>
  );
}
