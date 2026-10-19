import { Position, type Node, type NodeProps } from "@xyflow/react";
import type { GraphNode } from "@/contracts/graph";

export { Position };
export type { Node, NodeProps };

export type CustomNodeData = {
  id: string;
  kind: GraphNode["kind"];
  label: string;
  parentId: string | null;
  order: number;
  percent: number;
  status: GraphNode["status"];
  isExpanded?: boolean;
  isSelected?: boolean;
  onToggleExpand?: (id: string) => void;
  onSelect?: (id: string) => void;
  onMouseEnter?: (id: string) => void;
  onMouseLeave?: () => void;
  animateHighlight?: boolean;
  [key: string]: unknown;
};

export type GraphFlowNode = Node<CustomNodeData>;
