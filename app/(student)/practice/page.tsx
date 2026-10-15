import type { Metadata } from "next";
import { Award } from "lucide-react";
import { PageBody } from "@/components/layout/PageBody";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Practice Quizzes | NODUS",
  description: "Test your understanding of syllabus topics",
};

export default function PracticePage() {
  return (
    <>
      <SectionHeader
        eyebrow="[07] QUIZZES"
        title="Practice"
        description="Take AI-generated quizzes grounded in faculty slides and notes to master topics."
      />
      <PageBody>
        <EmptyState
          icon={Award}
          title="Practice Quizzes"
          description="Select a unit or topic to generate practice quizzes and track scores."
        />
      </PageBody>
    </>
  );
}
