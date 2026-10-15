import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FolderTree, BookOpen } from "lucide-react";
import { getGateway } from "@/lib/gateway";
import { EmptyState } from "@/components/ui/empty-state";
import { CurriculumManager } from "@/components/faculty/CurriculumManager";
import type { Resource } from "@/contracts/resources";
import { PageBody } from "@/components/layout/PageBody";

export const metadata: Metadata = {
  title: "Curriculum Content | Faculty | NODUS",
  description: "Manage subjects, units, topics, and teaching uploads",
};

export default async function FacultyContentPage() {
  const gateway = getGateway();
  const viewer = await gateway.auth.getViewer();

  if (!viewer || viewer.role !== "faculty") {
    redirect("/login");
  }

  const selection = await gateway.auth.getFacultySelection();
  const teaches = viewer.profile.teaches;

  if (teaches.length === 0) {
    return (
      <PageBody>
        <EmptyState
          icon={BookOpen}
          title="No Subjects Assigned"
          description="You do not have any teaching subjects assigned to your profile. Contact your department administrator."
        />
      </PageBody>
    );
  }

  const activeSubjectId =
    selection?.subjectId && teaches.some((t) => t.subjectId === selection.subjectId)
      ? selection.subjectId
      : teaches[0].subjectId;

  const activeTeaching = teaches.find((t) => t.subjectId === activeSubjectId) ?? teaches[0];
  const taughtSections = activeTeaching.sections;

  const subject = await gateway.curriculum.getSubject(activeSubjectId);

  const resourcesList = await Promise.all(
    subject.units.map((u) => gateway.resources.listUnitResources(u.id)),
  );

  const initialResourcesByUnit: Record<string, Resource[]> = {};
  subject.units.forEach((u, index) => {
    initialResourcesByUnit[u.id] = resourcesList[index] ?? [];
  });

  return (
    <PageBody className="space-y-6">
      <CurriculumManager
        key={subject.id}
        subject={subject}
        taughtSections={taughtSections}
        initialResourcesByUnit={initialResourcesByUnit}
      />
    </PageBody>
  );
}
