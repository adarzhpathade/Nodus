import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";
import { PageBody } from "@/components/layout/PageBody";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Faculty Dashboard | NODUS",
  description: "Class analytics and syllabus overview",
};

export default function FacultyDashboardPage() {
  return (
    <>
      <SectionHeader
        eyebrow="[01] CLASS ANALYTICS"
        title="Faculty Dashboard"
        description="Class progress, section comparisons, and topic comprehension analytics."
      />
      <PageBody>
        <EmptyState
          icon={LayoutDashboard}
          title="Class Analytics Overview"
          description="Section analytics, weak topics, and assignment submission donuts will be shown here."
        />
      </PageBody>
    </>
  );
}
