import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Subjects | NODUS",
  description: "Subjects for your selected semester",
};

export default function SubjectsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Subjects</h1>
        <p className="text-sm text-muted-foreground">
          Curriculum units and learning materials for this semester.
        </p>
      </div>
      <EmptyState
        icon={BookOpen}
        title="Subjects View"
        description="List of subjects and their units will be displayed here."
      />
    </div>
  );
}
