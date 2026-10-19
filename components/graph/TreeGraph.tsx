"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { StudentGraph, FacultyGraph, StudentHoverCard, FacultyHoverCard } from "@/contracts/graph";
import type { GraphFlowNode } from "./types";
import { useGraphStore } from "@/stores/useGraphStore";
import { SemesterNode } from "./nodes/SemesterNode";
import { SubjectNode } from "./nodes/SubjectNode";
import { UnitNode } from "./nodes/UnitNode";
import { TopicNode } from "./nodes/TopicNode";
import { HierarchyEdge } from "./edges/HierarchyEdge";
import { PrerequisiteEdge } from "./edges/PrerequisiteEdge";
import { HoverCard } from "./HoverCard";
import { SidePanel } from "./SidePanel";
import { FacultySidePanel } from "./FacultySidePanel";
import { GraphControls } from "./GraphControls";
import { getLayoutedElements } from "./layout";

const nodeTypes: NodeTypes = {
  semester: SemesterNode,
  subject: SubjectNode,
  unit: UnitNode,
  topic: TopicNode,
};

const edgeTypes: EdgeTypes = {
  hierarchy: HierarchyEdge,
  prerequisite: PrerequisiteEdge,
};

interface TreeGraphProps {
  graph: StudentGraph | FacultyGraph;
  mode?: "student" | "faculty";
  onTopicCoveredAnimation?: boolean;
}

function TreeGraphInner({ graph, mode = "student", onTopicCoveredAnimation = false }: TreeGraphProps) {
  const reactFlow = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  // Zustand Store
  const expandedSubjectIds = useGraphStore((s) => s.expandedSubjectIds);
  const toggleSubjectExpand = useGraphStore((s) => s.toggleSubjectExpand);
  const expandAllSubjects = useGraphStore((s) => s.expandAllSubjects);
  const selectedUnitId = useGraphStore((s) => s.selectedUnitId);
  const setSelectedUnitId = useGraphStore((s) => s.setSelectedUnitId);

  // Hover state
  const [hoveredCard, setHoveredCard] = useState<StudentHoverCard | FacultyHoverCard | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Cursor coordinates readout (blueprint paper signature)
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Initialize all subjects as expanded on initial load
  useEffect(() => {
    const subjectIds = graph.nodes.filter((n) => n.kind === "subject").map((n) => n.id);
    expandAllSubjects(subjectIds);
  }, [graph, expandAllSubjects]);

  const handleNodeMouseEnter = useCallback(
    (nodeId: string, event?: React.MouseEvent) => {
      const card = graph.hoverCards[nodeId];
      if (card) {
        setHoveredCard(card);
        if (event) {
          setMousePos({ x: event.clientX, y: event.clientY });
        }
      }
    },
    [graph.hoverCards]
  );

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredCard(null);
  }, []);

  const handleNodeSelect = useCallback(
    (nodeId: string) => {
      // If it's a unit, open side panel
      const targetNode = graph.nodes.find((n) => n.id === nodeId);
      if (targetNode && targetNode.kind === "unit") {
        setSelectedUnitId(nodeId);
      }
    },
    [graph.nodes, setSelectedUnitId]
  );

  // Compute visible nodes & edges based on expanded subjects
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    // 1. Determine which parent IDs are expanded
    // Root node (semester or subject with parentId === null) is always visible
    const subjectNodes = graph.nodes.filter((n) => n.kind === "subject");
    const activeSubjectIds = new Set(
      subjectNodes.filter((s) => expandedSubjectIds.has(s.id)).map((s) => s.id)
    );

    // Visible nodes:
    // - Root nodes (parentId === null)
    // - Subjects (always visible in tree)
    // - Units whose parent subject is expanded
    // - Topics whose parent unit's subject is expanded
    const visibleRawNodes = graph.nodes.filter((n) => {
      if (!n.parentId) return true;
      if (n.kind === "subject") return true;
      if (n.kind === "unit") {
        return expandedSubjectIds.has(n.parentId);
      }
      if (n.kind === "topic") {
        // find unit
        const parentUnit = graph.nodes.find((u) => u.id === n.parentId);
        if (!parentUnit || !parentUnit.parentId) return false;
        return expandedSubjectIds.has(parentUnit.parentId);
      }
      return true;
    });

    const visibleNodeIds = new Set(visibleRawNodes.map((n) => n.id));

    // Visible edges: both source and target must be in visibleNodeIds
    const visibleRawEdges = graph.edges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );

    // Map to React Flow Node objects
    const flowNodes: GraphFlowNode[] = visibleRawNodes.map((n) => ({
      id: n.id,
      type: n.kind,
      position: { x: 0, y: 0 },
      data: {
        ...n,
        isExpanded: expandedSubjectIds.has(n.id),
        isSelected: n.id === selectedUnitId,
        onToggleExpand: toggleSubjectExpand,
        onSelect: handleNodeSelect,
        onMouseEnter: (id: string) => {
          const card = graph.hoverCards[id];
          if (card) setHoveredCard(card);
        },
        onMouseLeave: handleNodeMouseLeave,
        animateHighlight: onTopicCoveredAnimation,
      },
    }));

    // Map to React Flow Edge objects
    const flowEdges: Edge[] = visibleRawEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.kind,
      animated: false,
    }));

    return getLayoutedElements(flowNodes, flowEdges);
  }, [
    graph,
    expandedSubjectIds,
    selectedUnitId,
    toggleSubjectExpand,
    handleNodeSelect,
    handleNodeMouseLeave,
    onTopicCoveredAnimation,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState<GraphFlowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync state whenever initialNodes or initialEdges change (e.g. on expand/collapse)
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Fit view on first mount
  useEffect(() => {
    const timer = setTimeout(() => {
      reactFlow.fitView({ padding: 0.15, duration: 400 });
    }, 50);
    return () => clearTimeout(timer);
  }, [reactFlow]);

  // Handle fly-to node from search
  const handleFlyToNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        // Expand parent subject if collapsed
        const rawNode = graph.nodes.find((n) => n.id === nodeId);
        if (rawNode && rawNode.parentId && rawNode.kind === "unit") {
          if (!expandedSubjectIds.has(rawNode.parentId)) {
            toggleSubjectExpand(rawNode.parentId);
          }
        }
        reactFlow.setCenter(node.position.x + 120, node.position.y + 50, {
          zoom: 1.15,
          duration: 700,
        });
        if (rawNode?.kind === "unit") {
          setSelectedUnitId(nodeId);
        }
      }
    },
    [nodes, graph.nodes, expandedSubjectIds, toggleSubjectExpand, reactFlow, setSelectedUnitId]
  );

  // Mouse move handler for coordinate display and hover card positioning
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    setCursorCoords({ x, y });
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-[calc(100vh-140px)] min-h-[520px] border border-border bg-blueprint overflow-hidden select-none"
    >
      {/* Blueprint Coordinates Indicator (Top Right) */}
      <div
        aria-hidden="true"
        className="absolute top-4 right-4 z-20 border border-border bg-card/90 px-2.5 py-1 text-label text-muted-foreground flex items-center gap-2 pointer-events-none"
      >
        <span className="size-1 bg-signal" />
        <span>
          X:{cursorCoords.x}PX Y:{cursorCoords.y}PX
        </span>
      </div>

      {/* In-Graph Controls & Search */}
      <GraphControls nodes={graph.nodes} onFlyToNode={handleFlyToNode} />

      {/* Main React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      />

      {/* Hover Card */}
      <HoverCard card={hoveredCard} position={mousePos} />

      {/* Side Panel for Student View */}
      {mode === "student" && (
        <SidePanel
          unitId={selectedUnitId}
          onClose={() => setSelectedUnitId(null)}
        />
      )}

      {/* Side Panel for Faculty View */}
      {mode === "faculty" && "section" in graph && (
        <FacultySidePanel
          unitId={selectedUnitId}
          section={graph.section}
          onClose={() => setSelectedUnitId(null)}
        />
      )}
    </div>
  );
}

export function TreeGraph(props: TreeGraphProps) {
  return (
    <ReactFlowProvider>
      <TreeGraphInner {...props} />
    </ReactFlowProvider>
  );
}
