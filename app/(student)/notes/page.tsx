import type { Metadata } from "next";
import { getGateway } from "@/lib/gateway";
import { NotesExplorer } from "@/components/student/NotesExplorer";
import type { SubjectWithUnitsAndTopics } from "@/components/student/CreateNoteDialog";

export const metadata: Metadata = {
  title: "My Notes | NODUS",
  description: "Personal student study notes linked to syllabus topics",
};

interface NotesPageProps {
  searchParams: Promise<{
    subject?: string;
    unit?: string;
    topic?: string;
    tag?: string;
    search?: string;
    sort?: "updated" | "created" | "title";
  }>;
}

export default async function NotesPage({ searchParams }: NotesPageProps) {
  const params = await searchParams;
  const gateway = getGateway();

  // Get active student semester selection
  const selection = await gateway.auth.getStudentSelection();
  const semesterNumber = selection.semesterNumber;

  // Fetch subjects and their unit/topic structures
  const subjectsList = await gateway.curriculum.listSubjects(semesterNumber);
  const subjectsWithDetails = await Promise.all(
    subjectsList.map((s) => gateway.curriculum.getSubject(s.id))
  );

  const subjectsData: SubjectWithUnitsAndTopics[] = subjectsWithDetails.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    units: s.units.map((u) => ({
      id: u.id,
      title: u.title,
      order: u.order,
      topics: u.topics.map((t) => ({
        id: t.id,
        title: t.title,
        order: t.order,
      })),
    })),
  }));

  // Fetch available tags
  const tags = await gateway.notes.listTags();

  // Initial notes query
  const initialNotes = await gateway.notes.listNotes({
    semesterNumber,
    subjectId: params.subject,
    unitId: params.unit,
    topicId: params.topic,
    tag: params.tag,
    search: params.search,
    sort: params.sort ?? "updated",
    limit: 12,
  });

  return (
    <NotesExplorer
      initialData={initialNotes}
      subjects={subjectsData}
      tags={tags}
      semesterNumber={semesterNumber}
      initialFilters={{
        subjectId: params.subject,
        unitId: params.unit,
        topicId: params.topic,
        tag: params.tag,
        search: params.search,
        sort: params.sort,
      }}
    />
  );
}
