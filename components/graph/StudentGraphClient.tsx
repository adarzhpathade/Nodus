"use client";

import { useEffect, useState, useRef } from "react";
import type { StudentGraph } from "@/contracts/graph";
import { TreeGraph } from "./TreeGraph";
import { GraphEmptyState } from "./GraphEmptyState";

interface StudentGraphClientProps {
  graph: StudentGraph;
}

export function StudentGraphClient({ graph }: StudentGraphClientProps) {
  const [animateCovered, setAnimateCovered] = useState(false);
  const prevPercentsRef = useRef<Map<string, number>>(new Map());

  // Detect if any node's percent has risen to trigger the "Topic covered" micro-animation
  useEffect(() => {
    let hasRisen = false;
    for (const node of graph.nodes) {
      const prev = prevPercentsRef.current.get(node.id);
      if (prev !== undefined && node.percent > prev) {
        hasRisen = true;
      }
      prevPercentsRef.current.set(node.id, node.percent);
    }

    if (hasRisen) {
      // One-shot flag driven by a data change, cleared by the timer below.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnimateCovered(true);
      const timer = setTimeout(() => setAnimateCovered(false), 2400);
      return () => clearTimeout(timer);
    }
  }, [graph]);

  if (!graph.nodes || graph.nodes.length === 0) {
    return <GraphEmptyState role="student" />;
  }

  return (
    <div className="w-full h-full">
      <TreeGraph
        graph={graph}
        mode="student"
        onTopicCoveredAnimation={animateCovered}
      />
    </div>
  );
}

export default StudentGraphClient;
