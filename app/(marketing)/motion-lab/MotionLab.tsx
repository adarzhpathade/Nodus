"use client";
import gsap from "gsap";
import { useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { CountUp } from "@/components/motion/CountUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { duration, gsapEase } from "@/components/motion/tokens";
import { loadScrollTrigger, useGsapContext } from "@/components/motion/useGsapContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MotionLab() {
  const reducedMotion = useReducedMotion();
  const [value, setValue] = useState(72);

  return (
    <SmoothScroll>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-16 px-6 py-16">
        <FadeIn>
          <h1 className="text-3xl font-semibold">Motion lab</h1>
          <p className="text-muted-foreground">
            Reduced motion: <strong>{reducedMotion ? "on" : "off"}</strong>
          </p>
        </FadeIn>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-medium">CountUp</h2>
          <div className="flex items-center gap-4">
            <CountUp value={value} suffix="%" className="text-5xl font-semibold tabular-nums" />
            <Button variant="outline" onClick={() => setValue(Math.round(Math.random() * 100))}>
              Change value
            </Button>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-medium">Stagger</h2>
          <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {["Notes", "Semester", "Quiz avg", "Streak"].map((label) => (
              <StaggerItem key={label}>
                <Card>
                  <CardHeader>
                    <CardTitle>{label}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground">Card</CardContent>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-medium">MagneticButton</h2>
          <MagneticButton>
            <Button size="lg">Hover me</Button>
          </MagneticButton>
        </section>

        <GsapTimelineDemo />

        <div className="h-[60vh]" aria-hidden="true" />
        <ScrollTriggerDemo />
        <div className="h-[80vh]" aria-hidden="true" />
      </main>
    </SmoothScroll>
  );
}

/** Timeline that replays on click — checks useGsapContext cleanup on unmount/re-run. */
function GsapTimelineDemo() {
  const scope = useRef<HTMLElement>(null);
  const [run, setRun] = useState(0);

  useGsapContext(
    ({ reducedMotion }) => {
      if (reducedMotion) {
        gsap.set(".lab-bar", { scaleX: 1 });
        return;
      }
      gsap
        .timeline()
        .from(".lab-bar", { scaleX: 0, transformOrigin: "left", duration: duration.slow, ease: gsapEase.outExpo, stagger: 0.1 });
    },
    { scope, dependencies: [run] },
  );

  return (
    <section ref={scope} className="flex flex-col gap-3">
      <h2 className="text-xl font-medium">GSAP timeline</h2>
      {[90, 65, 40].map((width) => (
        <div key={width} className="lab-bar h-3 rounded-full bg-primary" style={{ width: `${width}%` }} />
      ))}
      <Button variant="outline" className="self-start" onClick={() => setRun((n) => n + 1)}>
        Replay
      </Button>
    </section>
  );
}

/** ScrollTrigger driven by Lenis — the box rotates while it scrolls through the viewport. */
function ScrollTriggerDemo() {
  const scope = useRef<HTMLElement>(null);

  useGsapContext(
    ({ reducedMotion }) => {
      if (reducedMotion) return;
      let cancelled = false;
      let tween: gsap.core.Tween | undefined;
      loadScrollTrigger().then(() => {
        if (cancelled) return;
        tween = gsap.to(".lab-box", {
          rotate: 180,
          ease: "none",
          scrollTrigger: { trigger: scope.current, start: "top bottom", end: "bottom top", scrub: true },
        });
      });
      return () => {
        cancelled = true;
        tween?.scrollTrigger?.kill();
        tween?.kill();
      };
    },
    { scope },
  );

  return (
    <section ref={scope} className="flex flex-col items-center gap-4">
      <h2 className="text-xl font-medium">ScrollTrigger + Lenis</h2>
      <div className="lab-box size-24 rounded-xl bg-primary" />
    </section>
  );
}
