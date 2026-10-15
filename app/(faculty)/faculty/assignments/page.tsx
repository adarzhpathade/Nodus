import type { Metadata } from "next";
import { CheckSquare } from "lucide-react";
import { PageBody } from "@/components/layout/PageBody";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Faculty Assignments | NODUS",
  description: "Create coursework and track offline submissions",
};

export default function FacultyAssignmentsPage() {
  return (
    <>
      <SectionHeader
        eyebrow="[04] COURSEWORK"
        title="Faculty Assignments"
        description="Create offline coursework for your sections and manage grading."
      />
      <PageBody>
        <EmptyState
          icon={CheckSquare}
          title="Assignment Management"
          description="Assignment creator and section-wise submissions table will appear here."
        />
      </PageBody>
    </>
  );
}
