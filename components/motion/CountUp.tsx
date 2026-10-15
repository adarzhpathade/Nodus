"use client";
// Animated number. Writes straight to the DOM (no re-render per frame).
// Starts when visible; animates from the previous value when `value` changes.
// Reduced motion: shows the final value immediately.
import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { duration as durations, ease } from "./tokens";

type CountUpProps = {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
};

export function CountUp({ value, decimals = 0, prefix = "", suffix = "", duration = durations.countUp, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const current = useRef(0);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const format = (n: number) =>
      `${prefix}${n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;

    if (reducedMotion) {
      current.current = value;
      node.textContent = format(value);
      return;
    }
    if (!inView) return;

    const controls = animate(current.current, value, {
      duration,
      ease: ease.outExpo,
      onUpdate: (latest) => {
        current.current = latest;
        node.textContent = format(latest);
      },
    });
    return () => controls.stop();
  }, [value, decimals, prefix, suffix, duration, inView, reducedMotion]);

  // Screen readers get the final value; the animated text is hidden from them.
  return (
    <span className={className}>
      <span ref={ref} aria-hidden="true">
        {prefix}
        {(0).toFixed(decimals)}
        {suffix}
      </span>
      <span className="sr-only">
        {prefix}
        {value.toFixed(decimals)}
        {suffix}
      </span>
    </span>
  );
}
