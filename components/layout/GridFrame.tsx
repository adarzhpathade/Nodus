import { cn } from "@/lib/utils";
import { Crosshair } from "./Crosshair";

interface GridFrameProps {
  children: React.ReactNode;
  className?: string;
  showCrosshairs?: boolean;
}

/** The one thin frame every page sits inside, like a drawing sheet on a board (ui_design.md §5.1). */
export function GridFrame({ children, className, showCrosshairs = true }: GridFrameProps) {
  return (
    <div className={cn("page-frame text-foreground relative flex flex-col", className)}>
      {showCrosshairs && (
        <>
          <Crosshair className="text-border pointer-events-none absolute -top-1.5 -left-1.5 z-50 select-none" />
          <Crosshair className="text-border pointer-events-none absolute -top-1.5 -right-1.5 z-50 select-none" />
          <Crosshair className="text-border pointer-events-none absolute -bottom-1.5 -left-1.5 z-50 select-none" />
          <Crosshair className="text-border pointer-events-none absolute -bottom-1.5 -right-1.5 z-50 select-none" />
        </>
      )}
      {children}
    </div>
  );
}

