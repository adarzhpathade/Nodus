import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "My Notes | NODUS",
  description: "Personal student study notes linked to topics",
};

export default function NotesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">My Notes</h1>
        <p className="text-sm text-muted-foreground">
          Private study notes connected directly to syllabus topics.
        </p>
      </div>
      <EmptyState
        icon={FileText}
        title="Notes Collection"
        description="Write and link your study notes to turn your syllabus graph green."
      />
    </div>
  );
}
