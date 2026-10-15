import { Skeleton } from "@/components/ui/skeleton";
import { NoteCardSkeleton } from "@/components/student/NoteCard";

export default function NotesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      <div className="space-y-3 rounded-xl border border-border/80 bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 w-full md:w-48 rounded-lg" />
          <Skeleton className="h-9 w-full md:w-44 rounded-lg" />
          <Skeleton className="h-9 w-full md:w-44 rounded-lg" />
          <Skeleton className="h-9 w-full md:w-40 rounded-lg" />
        </div>
        <div className="flex gap-2 pt-2 border-t border-border/40">
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
  );
}
