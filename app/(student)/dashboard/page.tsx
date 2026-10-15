import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Dashboard | NODUS",
  description: "Student overview and study progress",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Track your semester progress, upcoming deadlines, and study streaks.
        </p>
      </div>
      <EmptyState
        icon={LayoutDashboard}
        title="Dashboard Coming Soon"
        description="Stats, coverage rings, and activity heatmaps will appear here once configured."
      />
    </div>
  );
}
