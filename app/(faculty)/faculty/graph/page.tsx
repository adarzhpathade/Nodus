import type { Metadata } from "next";
import { GitFork } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Faculty Graph View | NODUS",
  description: "Class progress tree and syllabus structure",
};

export default function FacultyGraphPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Class Graph View</h1>
        <p className="text-sm text-muted-foreground">
          Syllabus knowledge tree with aggregated class mastery and student progress.
        </p>
      </div>
      <EmptyState
        icon={GitFork}
        title="Class Knowledge Tree"
        description="Interactive tree showing class-wide unit mastery and weak topics."
      />
    </div>
  );
}
