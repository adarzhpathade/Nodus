import type { Metadata } from "next";
import { GitFork } from "lucide-react";
import { PageBody } from "@/components/layout/PageBody";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Graph View | NODUS",
  description: "Interactive syllabus tree and knowledge graph",
};

export default function GraphPage() {
  return (
    <>
      <SectionHeader
        eyebrow="[02] KNOWLEDGE TREE"
        title="Graph View"
        description="Visual knowledge tree connecting semesters, subjects, units, and topics."
      />
      <PageBody>
        <EmptyState
          icon={GitFork}
          title="Knowledge Graph Loading"
          description="The interactive syllabus tree canvas will be rendered here."
        />
      </PageBody>
    </>
  );
}
