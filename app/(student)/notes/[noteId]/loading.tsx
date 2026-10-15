import { NoteEditorSkeleton } from "@/components/editor/NoteEditor";
import { PageBody } from "@/components/layout/PageBody";

export default function NoteLoading() {
  return (
    <PageBody>
      <NoteEditorSkeleton />
    </PageBody>
  );
}
