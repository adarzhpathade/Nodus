import { Skeleton } from "@/components/ui/skeleton";
import { NoteCardSkeleton } from "@/components/student/NoteCard";
import { PageBody } from "@/components/layout/PageBody";

export default function NotesLoading() {
  return (
    <PageBody>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-40 rounded-lg" />
            <Skeleton className="h-4 w-64 rounded" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>

        <div className="border-border/80 bg-card space-y-3 rounded-xl border p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Skeleton className="h-9 flex-1 rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg md:w-48" />
            <Skeleton className="h-9 w-full rounded-lg md:w-44" />
            <Skeleton className="h-9 w-full rounded-lg md:w-44" />
            <Skeleton className="h-9 w-full rounded-lg md:w-40" />
          </div>
          <div className="border-border/40 flex gap-2 border-t pt-2">
            <Skeleton className="h-5 w-12 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-14 rounded-md" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <NoteCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </PageBody>
  );
}
