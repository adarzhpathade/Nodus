import type { Metadata } from "next";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Faculty Tracker | NODUS",
  description: "Section-wise student submission and progress tracking",
};

export default function FacultyTrackerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Section Tracker</h1>
        <p className="text-sm text-muted-foreground">
          Track student completion, offline submissions, and individual study performance.
        </p>
      </div>
      <EmptyState
        icon={Users}
        title="Student Progress Tracker"
        description="Submission donuts, student rosters, and individual progress bars will be displayed here."
      />
    </div>
  );
}
