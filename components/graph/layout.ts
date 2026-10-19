import dagre from "@dagrejs/dagre";
import { Position, type Edge } from "@xyflow/react";
import type { GraphFlowNode } from "./types";

const NODE_WIDTH = 240;
const NODE_HEIGHT = 100;

export function getLayoutedElements(
  nodes: GraphFlowNode[],
  edges: Edge[],
  direction = "LR"
): { nodes: GraphFlowNode[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 40,
    ranksep: 96,
  });

  nodes.forEach((node) => {
    const width = node.type === "topic" ? 224 : node.type === "semester" ? 224 : NODE_WIDTH;
    const height = node.type === "topic" ? 76 : NODE_HEIGHT;
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    if (dagreGraph.hasNode(edge.source) && dagreGraph.hasNode(edge.target)) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(dagreGraph);

  const layoutedNodes: GraphFlowNode[] = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const width = node.type === "topic" ? 224 : node.type === "semester" ? 224 : NODE_WIDTH;
    const height = node.type === "topic" ? 76 : NODE_HEIGHT;

    return {
      ...node,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      position: {
        x: nodeWithPosition ? Math.round(nodeWithPosition.x - width / 2) : 0,
        y: nodeWithPosition ? Math.round(nodeWithPosition.y - height / 2) : 0,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
