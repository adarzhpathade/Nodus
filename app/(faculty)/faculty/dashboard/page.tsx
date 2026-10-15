import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Faculty Dashboard | NODUS",
  description: "Class analytics and syllabus overview",
};

export default function FacultyDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Faculty Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Class progress, section comparisons, and topic comprehension analytics.
        </p>
      </div>
      <EmptyState
        icon={LayoutDashboard}
        title="Class Analytics Overview"
        description="Section analytics, weak topics, and assignment submission donuts will be shown here."
      />
    </div>
  );
}
