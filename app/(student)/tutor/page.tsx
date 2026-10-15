import type { Metadata } from "next";
import { Bot } from "lucide-react";
import { PageBody } from "@/components/layout/PageBody";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "AI Tutor | NODUS",
  description: "Grounded AI study tutor for your syllabus and notes",
};

export default function TutorPage() {
  return (
    <>
      <SectionHeader
        eyebrow="[06] ASSISTANT"
        title="AI Tutor"
        description="Ask questions grounded in faculty materials and your personal notes."
      />
      <PageBody>
        <EmptyState
          icon={Bot}
          title="AI Tutor Chat"
          description="Start a chat conversation scoped to your semester, subject, or unit."
        />
      </PageBody>
    </>
  );
}
