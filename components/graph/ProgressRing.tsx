"use client";

import { cn } from "@/lib/utils";
import type { ProgressStatus } from "@/contracts/common";
import { getStatusMeta } from "./status";

interface ProgressRingProps {
  percent: number;
  status: ProgressStatus;
  size?: number;
  strokeWidth?: number;
  showText?: boolean;
  className?: string;
  animateChange?: boolean;
}

export function ProgressRing({
  percent,
  status,
  size = 36,
  strokeWidth = 3,
  showText = false,
  className,
  animateChange = false,
}: ProgressRingProps) {
  const meta = getStatusMeta(status);
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(clampedPercent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${meta.label}: ${Math.round(clampedPercent)}%`}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90 origin-center transition-transform"
      >
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.35}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={meta.strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="square"
          fill="none"
          className={cn(
            "transition-[stroke-dashoffset] duration-700 ease-out",
            animateChange && "animate-pulse"
          )}
        />
      </svg>
      {showText && (
        <span className="absolute font-mono text-xs font-medium tracking-tighter text-foreground">
          {Math.round(clampedPercent)}%
        </span>
      )}
    </div>
  );
}
