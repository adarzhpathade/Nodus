import type { Metadata } from "next";
import { Bot } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "AI Tutor | NODUS",
  description: "Grounded AI study tutor for your syllabus and notes",
};

export default function TutorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">AI Tutor</h1>
        <p className="text-sm text-muted-foreground">
          Ask questions grounded in faculty materials and your personal notes.
        </p>
      </div>
      <EmptyState
        icon={Bot}
        title="AI Tutor Chat"
        description="Start a chat conversation scoped to your semester, subject, or unit."
      />
    </div>
  );
}
