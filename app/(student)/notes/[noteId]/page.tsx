import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGateway } from "@/lib/gateway";
import { NoteEditor } from "@/components/editor/NoteEditor";
import { PageBody } from "@/components/layout/PageBody";

interface NotePageProps {
  params: Promise<{ noteId: string }>;
}

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const { noteId } = await params;
  const gateway = getGateway();

  try {
    const note = await gateway.notes.getNote(noteId);
    return {
      title: `${note.title || "Untitled note"} | NODUS`,
      description: note.excerpt || "Personal student study note linked to syllabus topics.",
    };
  } catch {
    return {
      title: "Note Editor | NODUS",
    };
  }
}

export default async function NotePage({ params }: NotePageProps) {
  const { noteId } = await params;
  const gateway = getGateway();

  let note;
  try {
    note = await gateway.notes.getNote(noteId);
  } catch (err: unknown) {
    console.error("Note not found or unauthorized:", err);
    notFound();
  }

  return (
    <PageBody>
      <NoteEditor note={note} />
    </PageBody>
  );
}
