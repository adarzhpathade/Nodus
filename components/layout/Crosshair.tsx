import { cn } from "@/lib/utils";

/** 12px `+` registration mark used at the corners of stages and panels (ui_design.md §5.4). */
export function Crosshair({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className={cn("text-foreground size-3", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <path d="M6 0v12M0 6h12" />
    </svg>
  );
}
