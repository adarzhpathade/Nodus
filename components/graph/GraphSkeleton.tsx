import { Skeleton } from "@/components/ui/skeleton";

export function GraphSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading knowledge tree"
      className="relative w-full h-[calc(100vh-140px)] min-h-[500px] border border-border bg-blueprint flex items-center justify-center p-8 overflow-hidden select-none"
    >
      <div className="flex items-center gap-16 animate-pulse opacity-70">
        {/* Semester Root Skeleton */}
        <div className="w-56 border border-border bg-card p-4 space-y-3">
          <Skeleton className="h-4 w-24 bg-muted" />
          <Skeleton className="h-6 w-36 bg-muted" />
          <div className="flex justify-between items-center pt-2">
            <Skeleton className="h-3 w-16 bg-muted" />
            <Skeleton className="size-9 rounded-full bg-muted" />
          </div>
        </div>

        {/* Subjects Column Skeleton */}
        <div className="flex flex-col gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-60 border border-border bg-card p-3.5 space-y-2.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20 bg-muted" />
                <Skeleton className="h-3 w-14 bg-muted" />
              </div>
              <Skeleton className="h-5 w-40 bg-muted" />
              <div className="flex justify-between items-center pt-1">
                <Skeleton className="h-3 w-24 bg-muted" />
                <Skeleton className="size-8 rounded-full bg-muted" />
              </div>
            </div>
          ))}
        </div>

        {/* Units Column Skeleton */}
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-60 border border-border bg-card p-3 space-y-2">
              <Skeleton className="h-3 w-16 bg-muted" />
              <Skeleton className="h-4 w-36 bg-muted" />
              <div className="flex justify-between items-center pt-1">
                <Skeleton className="h-3 w-20 bg-muted" />
                <Skeleton className="size-7 rounded-full bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-4 left-4 border border-border bg-card/90 px-3 py-1.5 font-mono text-xs text-muted-foreground">
        [SYSTEM] COMPUTING SYLLABUS GRAPH LAYOUT...
      </div>
    </div>
  );
}
