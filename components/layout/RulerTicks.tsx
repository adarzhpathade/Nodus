import { cn } from "@/lib/utils";

interface RulerTicksProps {
  orientation: "horizontal" | "vertical";
  className?: string;
}

/** Dotted ruler strips: thin tick marks along an edge (ui_design.md §5.3). */
export function RulerTicks({ orientation, className }: RulerTicksProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute z-10 select-none",
        orientation === "horizontal" ? "ruler-x inset-x-0 h-2.5" : "ruler-y inset-y-0 w-2.5",
        className
      )}
    />
  );
}
