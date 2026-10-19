import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getGateway } from "@/lib/gateway";
import { PageBody } from "@/components/layout/PageBody";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { GraphSkeleton } from "@/components/graph/GraphSkeleton";
import { GraphErrorState } from "@/components/graph/GraphErrorState";
import { GraphEmptyState } from "@/components/graph/GraphEmptyState";
import type { StudentGraph } from "@/contracts/graph";

export const metadata: Metadata = {
  title: "Graph View | NODUS",
  description: "Interactive syllabus tree and knowledge graph",
};

const StudentGraphClient = dynamic(
  () => import("@/components/graph/StudentGraphClient"),
  {
    ssr: false,
    loading: () => <GraphSkeleton />,
  }
);

export default async function GraphPage() {
  const gateway = getGateway();
  let graphData: StudentGraph | null = null;
  let errorMessage: string | null = null;
  let isLocked = false;
  let semesterNum = 1;

  try {
    const selection = await gateway.auth.getStudentSelection();
    semesterNum = selection.semesterNumber;
    graphData = await gateway.graph.getStudentGraph(selection.semesterNumber);
  } catch (err: unknown) {
    const errObj = err as { code?: string; message?: string };
    if (errObj.code === "LOCKED") {
      isLocked = true;
    } else {
      errorMessage = errObj.message || "Failed to load syllabus graph data.";
    }
  }

  return (
    <>
      <SectionHeader
        eyebrow="[02] KNOWLEDGE TREE"
        title="Graph View"
        description="Visual knowledge tree connecting semesters, subjects, units, and topics."
      />
      <PageBody className="p-0 sm:p-0 md:p-0">
        {isLocked ? (
          <GraphEmptyState
            title={`Semester ${semesterNum} is Locked`}
            description="Future semesters cannot be opened until current curriculum requirements are met."
            role="student"
          />
        ) : errorMessage ? (
          <GraphErrorState message={errorMessage} />
        ) : graphData ? (
          <StudentGraphClient graph={graphData} />
        ) : (
          <GraphSkeleton />
        )}
      </PageBody>
    </>
  );
}
