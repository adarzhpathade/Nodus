"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ArrowRight } from "lucide-react";
import { ProgressRing } from "../ProgressRing";
import { getStatusMeta } from "../status";
import { cn } from "@/lib/utils";
import type { GraphFlowNode } from "../types";

export const UnitNode = memo(function UnitNode({ data }: NodeProps<GraphFlowNode>) {
  const meta = getStatusMeta(data.status);
  const StatusIcon = meta.Icon;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      data.onSelect?.(data.id);
    }
  };

  return (
    <div
      role="treeitem"
      tabIndex={0}
      aria-selected={data.isSelected}
      aria-label={`${data.label}, Unit node, ${Math.round(data.percent)}% completed, status ${meta.label}. Press Enter to view topics and resources.`}
      onKeyDown={handleKeyDown}
      onClick={() => data.onSelect?.(data.id)}
      onMouseEnter={() => data.onMouseEnter?.(data.id)}
      onMouseLeave={() => data.onMouseLeave?.()}
      className={cn(
        "group relative w-60 border border-border bg-card p-3 transition-colors cursor-pointer select-none",
        "hover:border-foreground/80 focus-visible:ring-1 focus-visible:ring-signal focus-visible:outline-none",
        data.isSelected && "border-foreground ring-1 ring-foreground bg-accent/40"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-border !border-0 !rounded-none"
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-1.5">
        <span className="text-label text-muted-foreground flex items-center gap-1">
          UNIT [0{data.order}]
        </span>
        <div className="flex items-center gap-1">
          <StatusIcon className={cn("size-3 shrink-0", meta.colorClass)} aria-hidden="true" />
          <span className={cn("text-xs font-mono uppercase tracking-wider", meta.colorClass)}>
            {meta.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-heading text-xs font-semibold uppercase text-foreground leading-snug line-clamp-2">
            {data.label}
          </h4>
          <p className="mt-1 flex items-center gap-1 font-mono text-xs text-muted-foreground group-hover:text-signal transition-colors">
            <span>View Syllabus Unit</span>
            <ArrowRight className="size-2.5 translate-x-0 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        <ProgressRing
          percent={data.percent}
          status={data.status}
          size={36}
          strokeWidth={3}
          showText
          animateChange={data.animateHighlight}
        />
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-border !border-0 !rounded-none"
      />
    </div>
  );
});
