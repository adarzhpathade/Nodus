import type { Metadata } from "next";
import { Award } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Practice Quizzes | NODUS",
  description: "Test your understanding of syllabus topics",
};

export default function PracticePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Practice</h1>
        <p className="text-sm text-muted-foreground">
          Take AI-generated quizzes grounded in faculty slides and notes to master topics.
        </p>
      </div>
      <EmptyState
        icon={Award}
        title="Practice Quizzes"
        description="Select a unit or topic to generate practice quizzes and track scores."
      />
    </div>
  );
}
