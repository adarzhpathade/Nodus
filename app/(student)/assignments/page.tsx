import type { Metadata } from "next";
import { CheckSquare } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Assignments | NODUS",
  description: "Course assignments, deadlines, and submission status",
};

export default function AssignmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Assignments</h1>
        <p className="text-sm text-muted-foreground">
          Track offline assignments, due dates, and marks assigned by faculty.
        </p>
      </div>
      <EmptyState
        icon={CheckSquare}
        title="Assignments List"
        description="All offline coursework and grading statuses will appear here."
      />
    </div>
  );
}
