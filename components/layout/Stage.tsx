import { cn } from "@/lib/utils";
import { Crosshair } from "./Crosshair";

interface StageProps {
  children?: React.ReactNode;
  className?: string;
  blueprint?: boolean;
  rulers?: boolean;
  crosshairs?: boolean;
}

/**
 * Architectural measured stage area with corner crosshairs, border hairline,
 * optional perimeter rulers and optional blueprint grid (ui_design.md §5).
 */
export function Stage({
  children,
  className,
  blueprint = false,
  rulers = true,
  crosshairs = true,
}: StageProps) {
  return (
    <div
      className={cn(
        "border-border relative border",
        blueprint && "bg-blueprint",
        className
      )}
    >
      {crosshairs && (
        <>
          <Crosshair className="text-border pointer-events-none absolute -top-1.5 -left-1.5 z-20 select-none" />
          <Crosshair className="text-border pointer-events-none absolute -top-1.5 -right-1.5 z-20 select-none" />
          <Crosshair className="text-border pointer-events-none absolute -bottom-1.5 -left-1.5 z-20 select-none" />
          <Crosshair className="text-border pointer-events-none absolute -bottom-1.5 -right-1.5 z-20 select-none" />
        </>
      )}

      {rulers && (
        <>
          <div aria-hidden="true" className="ruler-x pointer-events-none absolute inset-x-3 top-0 opacity-40 select-none" />
          <div aria-hidden="true" className="ruler-x pointer-events-none absolute inset-x-3 bottom-0 opacity-40 select-none" />
          <div aria-hidden="true" className="ruler-y pointer-events-none absolute inset-y-3 left-0 opacity-40 select-none" />
          <div aria-hidden="true" className="ruler-y pointer-events-none absolute inset-y-3 right-0 opacity-40 select-none" />
        </>
      )}

      {children}
    </div>
  );
}
