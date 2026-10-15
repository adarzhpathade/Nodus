import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PageBody } from "@/components/layout/PageBody";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Faculty Tracker | NODUS",
  description: "Section-wise student submission and progress tracking",
};

export default function FacultyTrackerPage() {
  return (
    <>
      <SectionHeader
        eyebrow="[05] SECTIONS"
        title="Section Tracker"
        description="Track student completion, offline submissions, and individual study performance."
      />
      <PageBody>
        <EmptyState
          icon={Users}
          title="Student Progress Tracker"
          description="Submission donuts, student rosters, and individual progress bars will be displayed here."
        />
      </PageBody>
    </>
  );
}
