import type { Metadata } from "next";
import { CheckSquare } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Faculty Assignments | NODUS",
  description: "Create coursework and track offline submissions",
};

export default function FacultyAssignmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Faculty Assignments</h1>
        <p className="text-sm text-muted-foreground">
          Create offline coursework for your sections and manage grading.
        </p>
      </div>
      <EmptyState
        icon={CheckSquare}
        title="Assignment Management"
        description="Assignment creator and section-wise submissions table will appear here."
      />
    </div>
  );
}
