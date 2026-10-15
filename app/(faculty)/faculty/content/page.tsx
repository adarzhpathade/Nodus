import type { Metadata } from "next";
import { FolderTree } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Faculty Content | NODUS",
  description: "Manage subjects, units, topics, and teaching uploads",
};

export default function FacultyContentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Curriculum Content</h1>
        <p className="text-sm text-muted-foreground">
          Manage syllabus hierarchy, define topics, and upload lecture slides and notes.
        </p>
      </div>
      <EmptyState
        icon={FolderTree}
        title="Curriculum & Resources"
        description="Units and topics tree with drag-and-drop reordering and resource uploads."
      />
    </div>
  );
}
