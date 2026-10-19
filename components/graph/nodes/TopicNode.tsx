"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ProgressRing } from "../ProgressRing";
import { getStatusMeta } from "../status";
import { cn } from "@/lib/utils";
import type { GraphFlowNode } from "../types";

export const TopicNode = memo(function TopicNode({ data }: NodeProps<GraphFlowNode>) {
  const meta = getStatusMeta(data.status);
  const StatusIcon = meta.Icon;

  return (
    <div
      role="treeitem"
      tabIndex={0}
      aria-label={`${data.label}, Topic node, ${Math.round(data.percent)}% coverage, status ${meta.label}`}
      onMouseEnter={() => data.onMouseEnter?.(data.id)}
      onMouseLeave={() => data.onMouseLeave?.()}
      className={cn(
        "group relative w-56 border border-border bg-card p-2.5 transition-colors select-none",
        "hover:border-foreground/80 focus-visible:ring-1 focus-visible:ring-signal focus-visible:outline-none"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-border !border-0 !rounded-none"
      />

      <div className="flex items-center justify-between gap-1 border-b border-border/40 pb-1">
        <span className="text-label text-muted-foreground">
          TOPIC [0{data.order}]
        </span>
        <div className="flex items-center gap-1">
          <StatusIcon className={cn("size-2.5 shrink-0", meta.colorClass)} aria-hidden="true" />
          <span className={cn("text-xs font-mono uppercase tracking-wider", meta.colorClass)}>
            {meta.label}
          </span>
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <h5 className="font-heading text-xs font-medium uppercase text-foreground leading-snug line-clamp-2">
          {data.label}
        </h5>
        <ProgressRing
          percent={data.percent}
          status={data.status}
          size={30}
          strokeWidth={2.5}
          showText
          animateChange={data.animateHighlight}
        />
      </div>
    </div>
  );
});
