"use client";

import type { FacultyGraph } from "@/contracts/graph";
import { TreeGraph } from "./TreeGraph";
import { GraphEmptyState } from "./GraphEmptyState";

interface FacultyGraphClientProps {
  graph: FacultyGraph;
}

export function FacultyGraphClient({ graph }: FacultyGraphClientProps) {
  if (!graph.nodes || graph.nodes.length === 0) {
    return (
      <GraphEmptyState
        role="faculty"
        title="No Class Curriculum Mapped"
        description="No syllabus units or student progress available for this section."
      />
    );
  }

  return (
    <div className="w-full h-full">
      <TreeGraph graph={graph} mode="faculty" />
    </div>
  );
}

export default FacultyGraphClient;
