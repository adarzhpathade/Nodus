import { cn } from "@/lib/utils";

/** The one thin frame every page sits inside, like a drawing sheet on a board (ui_design.md §5.1). */
export function GridFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("page-frame bg-background text-foreground relative flex flex-col", className)}>
      {children}
    </div>
  );
}
