"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { GraphFlowNode, CustomNodeData } from "../types";
import { ProgressRing } from "../ProgressRing";
import { getStatusMeta } from "../status";
import { cn } from "@/lib/utils";

export type { CustomNodeData, GraphFlowNode };

export const SemesterNode = memo(function SemesterNode({ data }: NodeProps<GraphFlowNode>) {
  const meta = getStatusMeta(data.status);
  const StatusIcon = meta.Icon;

  return (
    <div
      role="treeitem"
      tabIndex={0}
      aria-label={`${data.label}, Semester node, ${Math.round(data.percent)}% completed, status ${meta.label}`}
      className={cn(
        "relative w-56 border border-border bg-card p-3.5 transition-colors select-none",
        "focus-visible:ring-1 focus-visible:ring-signal focus-visible:outline-none",
        data.isSelected && "border-foreground ring-1 ring-foreground"
      )}
      onMouseEnter={() => data.onMouseEnter?.(data.id)}
      onMouseLeave={() => data.onMouseLeave?.()}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <span className="text-label text-muted-foreground flex items-center gap-1.5">
          <span className="size-1.5 bg-signal shrink-0" aria-hidden="true" />
          ROOT SEMESTER
        </span>
        <div className="flex items-center gap-1">
          <StatusIcon className={cn("size-3 shrink-0", meta.colorClass)} aria-hidden="true" />
          <span className={cn("text-xs font-mono uppercase tracking-wider", meta.colorClass)}>
            {meta.label}
          </span>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-sm font-semibold tracking-tight uppercase text-foreground">
            {data.label}
          </h2>
          <p className="font-mono text-xs text-muted-foreground mt-0.5">
            Syllabus Core
          </p>
        </div>
        <ProgressRing
          percent={data.percent}
          status={data.status}
          size={38}
          strokeWidth={3.5}
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
