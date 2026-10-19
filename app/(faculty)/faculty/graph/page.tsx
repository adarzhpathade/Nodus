import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getGateway } from "@/lib/gateway";
import { PageBody } from "@/components/layout/PageBody";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { GraphSkeleton } from "@/components/graph/GraphSkeleton";
import { GraphErrorState } from "@/components/graph/GraphErrorState";
import { GraphEmptyState } from "@/components/graph/GraphEmptyState";
import type { FacultyGraph } from "@/contracts/graph";

export const metadata: Metadata = {
  title: "Faculty Graph View | NODUS",
  description: "Class progress tree and syllabus structure",
};

const FacultyGraphClient = dynamic(
  () => import("@/components/graph/FacultyGraphClient"),
  {
    ssr: false,
    loading: () => <GraphSkeleton />,
  }
);

export default async function FacultyGraphPage() {
  const gateway = getGateway();
  let graphData: FacultyGraph | null = null;
  let errorMessage: string | null = null;

  try {
    const viewer = await gateway.auth.getViewer();
    if (viewer && viewer.role === "faculty") {
      const selection = await gateway.auth.getFacultySelection();
      const defaultAssignment = viewer.profile.teaches[0];

      const subjectId = selection?.subjectId ?? defaultAssignment?.subjectId;
      const section = selection?.section ?? defaultAssignment?.sections[0];

      if (subjectId && section) {
        graphData = await gateway.graph.getFacultyGraph({ subjectId, section });
      }
    }
  } catch (err: unknown) {
    const errObj = err as { message?: string };
    errorMessage = errObj.message || "Failed to load class syllabus tree.";
  }

  return (
    <>
      <SectionHeader
        eyebrow="[02] CLASS TREE"
        title="Class Graph View"
        description="Syllabus knowledge tree with aggregated class mastery and student progress."
      />
      <PageBody className="p-0 sm:p-0 md:p-0">
        {errorMessage ? (
          <GraphErrorState message={errorMessage} />
        ) : graphData ? (
          <FacultyGraphClient graph={graphData} />
        ) : (
          <GraphEmptyState
            role="faculty"
            title="No Class Assigned"
            description="Please select a subject and section in the top bar to inspect class progress."
          />
        )}
      </PageBody>
    </>
  );
}
