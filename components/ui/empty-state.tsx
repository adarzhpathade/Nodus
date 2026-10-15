import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  action?: React.ReactNode;
  className?: string;
}

/** Blueprint-grid area, square bordered icon cell, mono caption (ui_design.md §7 "Empty state"). */
export function EmptyState({ title, description, icon: Icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "bg-blueprint border-border animate-in fade-in-50 flex min-h-[240px] flex-col items-center justify-center border p-8 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="bg-background border-border text-foreground mb-4 border p-3">
          <Icon className="size-5" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-label text-foreground">{title}</h3>
      {description && <p className="text-muted-foreground mt-2 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
