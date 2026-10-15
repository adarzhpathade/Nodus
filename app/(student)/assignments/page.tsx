import type { Metadata } from "next";
import { CheckSquare } from "lucide-react";
import { PageBody } from "@/components/layout/PageBody";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Assignments | NODUS",
  description: "Course assignments, deadlines, and submission status",
};

export default function AssignmentsPage() {
  return (
    <>
      <SectionHeader
        eyebrow="[05] COURSEWORK"
        title="Assignments"
        description="Track offline assignments, due dates, and marks assigned by faculty."
      />
      <PageBody>
        <EmptyState
          icon={CheckSquare}
          title="Assignments List"
          description="All offline coursework and grading statuses will appear here."
        />
      </PageBody>
    </>
  );
}
