import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { getGateway } from "@/lib/gateway";
import { EmptyState } from "@/components/ui/empty-state";
import { FadeIn } from "@/components/motion/FadeIn";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { SubjectCard } from "@/components/student/SubjectCard";
import type { ProgressStatus } from "@/contracts/common";

export const metadata: Metadata = {
  title: "Subjects | NODUS",
  description: "Subjects and learning materials for your current semester",
};

export default async function SubjectsPage() {
  const gateway = getGateway();
  const selection = await gateway.auth.getStudentSelection();
  const semesterNumber = selection.semesterNumber;

  const [subjects, prerequisites, graph] = await Promise.all([
    gateway.curriculum.listSubjects(semesterNumber),
    gateway.curriculum.listPrerequisites(semesterNumber),
    gateway.graph.getStudentGraph(semesterNumber),
  ]);

  const subjectDetails = await Promise.all(
    subjects.map((s) => gateway.curriculum.getSubject(s.id))
  );

  const subjectNodeMap = new Map<string, { percent: number; status: ProgressStatus }>();
  const unitNodeMap: Record<string, { percent: number; status: ProgressStatus }> = {};

  for (const node of graph.nodes) {
    if (node.kind === "subject") {
      subjectNodeMap.set(node.id, { percent: node.percent, status: node.status });
    } else if (node.kind === "unit") {
      unitNodeMap[node.id] = { percent: node.percent, status: node.status };
    }
  }

  // Map prerequisites to readable labels
  const subjectNameMap = new Map(subjects.map((s) => [s.id, `${s.code} ${s.name}`]));
  const prereqMap = new Map<string, string[]>();
  for (const p of prerequisites) {
    const list = prereqMap.get(p.subjectId) ?? [];
    const name = subjectNameMap.get(p.prerequisiteSubjectId);
    if (name) list.push(name);
    prereqMap.set(p.subjectId, list);
  }

  // Calculate semester average
  const avgPercent = subjects.length > 0
    ? Math.round(
        subjects.reduce((sum, s) => sum + (subjectNodeMap.get(s.id)?.percent ?? 0), 0) /
          subjects.length
      )
    : 0;

  return (
    <div className="space-y-6">
      <FadeIn direction="down" distance={12}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              Semester {semesterNumber} Subjects
            </h1>
            <p className="text-sm text-muted-foreground">
              Explore your curriculum subjects, track unit completion, and dive into your notes.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2 text-sm shadow-xs">
            <span className="text-muted-foreground">Overall Semester Coverage:</span>
            <span className="font-semibold text-foreground">{avgPercent}%</span>
          </div>
        </div>
      </FadeIn>

      {subjectDetails.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Subjects Found"
          description={`There are no registered subjects for Semester ${semesterNumber}. Check your semester switcher or contact faculty.`}
        />
      ) : (
        <Stagger className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {subjectDetails.map((subject) => {
            const pInfo = subjectNodeMap.get(subject.id) ?? {
              percent: 0,
              status: "not_started" as ProgressStatus,
            };
            return (
              <StaggerItem key={subject.id}>
                <SubjectCard
                  subject={subject}
                  percent={pInfo.percent}
                  status={pInfo.status}
                  prerequisiteNames={prereqMap.get(subject.id) ?? []}
                  unitProgressMap={unitNodeMap}
                />
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </div>
  );
}
