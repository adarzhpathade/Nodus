"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { ProgressRing } from "../ProgressRing";
import { getStatusMeta } from "../status";
import { cn } from "@/lib/utils";
import type { GraphFlowNode } from "../types";

export const SubjectNode = memo(function SubjectNode({ data }: NodeProps<GraphFlowNode>) {
  const meta = getStatusMeta(data.status);
  const StatusIcon = meta.Icon;
  const isExpanded = data.isExpanded ?? true;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      data.onToggleExpand?.(data.id);
    }
  };

  return (
    <div
      role="treeitem"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={`${data.label}, Subject node, ${Math.round(data.percent)}% completed, status ${meta.label}. Press Enter to ${isExpanded ? "collapse" : "expand"}.`}
      onKeyDown={handleKeyDown}
      onClick={() => data.onToggleExpand?.(data.id)}
      onMouseEnter={() => data.onMouseEnter?.(data.id)}
      onMouseLeave={() => data.onMouseLeave?.()}
      className={cn(
        "group relative w-60 border border-border bg-card p-3 transition-colors cursor-pointer select-none",
        "hover:border-foreground/80 focus-visible:ring-1 focus-visible:ring-signal focus-visible:outline-none",
        data.isSelected && "border-foreground ring-1 ring-foreground"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-border !border-0 !rounded-none"
      />

      {/* Header row */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-1.5">
        <span className="text-label text-muted-foreground">
          SUBJECT [0{data.order}]
        </span>
        <div className="flex items-center gap-1">
          <StatusIcon className={cn("size-3 shrink-0", meta.colorClass)} aria-hidden="true" />
          <span className={cn("text-xs font-mono uppercase tracking-wider", meta.colorClass)}>
            {meta.label}
          </span>
        </div>
      </div>

      {/* Body row */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-xs font-semibold uppercase text-foreground leading-snug line-clamp-2">
            {data.label}
          </h3>
          <div className="mt-1 flex items-center gap-1 text-xs font-mono text-muted-foreground">
            <span>{isExpanded ? "Units visible" : "Units collapsed"}</span>
            <span className="text-signal inline-block transition-transform duration-200">
              {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            </span>
          </div>
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
