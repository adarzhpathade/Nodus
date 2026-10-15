import type { Metadata } from "next";
import { GitFork } from "lucide-react";
import { PageBody } from "@/components/layout/PageBody";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Faculty Graph View | NODUS",
  description: "Class progress tree and syllabus structure",
};

export default function FacultyGraphPage() {
  return (
    <>
      <SectionHeader
        eyebrow="[02] CLASS TREE"
        title="Class Graph View"
        description="Syllabus knowledge tree with aggregated class mastery and student progress."
      />
      <PageBody>
        <EmptyState
          icon={GitFork}
          title="Class Knowledge Tree"
          description="Interactive tree showing class-wide unit mastery and weak topics."
        />
      </PageBody>
    </>
  );
}
