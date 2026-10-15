import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";
import { PageBody } from "@/components/layout/PageBody";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Dashboard | NODUS",
  description: "Student overview and study progress",
};

export default function DashboardPage() {
  return (
    <>
      <SectionHeader
        eyebrow="[01] OVERVIEW"
        title="Dashboard"
        description="Track your semester progress, upcoming deadlines, and study streaks."
      />
      <PageBody>
        <EmptyState
          icon={LayoutDashboard}
          title="Dashboard Coming Soon"
          description="Stats, coverage rings, and activity heatmaps will appear here once configured."
        />
      </PageBody>
    </>
  );
}
