import type { Metadata } from "next";
import { GitFork } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Graph View | NODUS",
  description: "Interactive syllabus tree and knowledge graph",
};

export default function GraphPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Graph View</h1>
        <p className="text-sm text-muted-foreground">
          Visual knowledge tree connecting semesters, subjects, units, and topics.
        </p>
      </div>
      <EmptyState
        icon={GitFork}
        title="Knowledge Graph Loading"
        description="The interactive syllabus tree canvas will be rendered here."
      />
    </div>
  );
}
