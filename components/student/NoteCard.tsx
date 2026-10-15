import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Calendar, FileText, ChevronRight, Tag as TagIcon } from "lucide-react";
import type { NoteSummary } from "@/contracts/notes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NoteCardProps {
  note: NoteSummary;
  onTagClick?: (tag: string) => void;
  className?: string;
}

export function NoteCard({ note, onTagClick, className }: NoteCardProps) {
  let relativeDate = "Recently";
  try {
    relativeDate = formatDistanceToNow(parseISO(note.updatedAt), { addSuffix: true });
  } catch {
    // Fallback if parsing fails
  }

  const locationBreadcrumb = [
    note.location.subjectName,
    note.location.unitTitle,
    note.location.topicTitle,
  ]
    .filter(Boolean)
    .join(" › ");

  return (
    <Card
      className={cn(
        "group relative flex flex-col justify-between border-border/80 bg-card transition-all duration-200 hover:border-foreground/30 hover:shadow-card hover:-translate-y-0.5",
        className
      )}
    >
      <div className="flex flex-col flex-1 p-5">
        {/* Location Breadcrumb & Date */}
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground pb-2.5">
          <span
            className="truncate font-mono tracking-tight text-muted-foreground/90 max-w-[70%]"
            title={locationBreadcrumb}
          >
            {locationBreadcrumb || `Sem ${note.location.semesterNumber}`}
          </span>
          <span className="shrink-0 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="size-3 text-muted-foreground/70" />
            {relativeDate}
          </span>
        </div>

        {/* Title */}
        <Link
          href={`/notes/${note.id}`}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm group-hover:text-primary transition-colors"
        >
          <CardTitle className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground">
            {note.title || "Untitled note"}
          </CardTitle>
        </Link>

        {/* Excerpt */}
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {note.excerpt || "No content yet. Click to start writing."}
        </p>

        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 pt-1">
            {note.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={(e) => {
                  if (onTagClick) {
                    e.preventDefault();
                    e.stopPropagation();
                    onTagClick(tag);
                  }
                }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground",
                  onTagClick && "cursor-pointer"
                )}
              >
                <TagIcon className="size-2.5 opacity-60" />
                <span>{tag}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div className="border-t border-border/50 bg-muted/20 px-5 py-2.5 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 text-[11px]">
          <FileText className="size-3 text-muted-foreground/60" />
          <span>Private note</span>
        </span>
        <Link
          href={`/notes/${note.id}`}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
        >
          <span>Open editor</span>
          <ChevronRight className="size-3" />
        </Link>
      </div>
    </Card>
  );
}

export function NoteCardSkeleton() {
  return (
    <Card className="flex flex-col justify-between border-border/80 bg-card p-5 animate-pulse">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="h-3 w-1/3 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
        <div className="h-5 w-3/4 rounded bg-muted" />
        <div className="space-y-1.5 pt-1">
          <div className="h-3 w-full rounded bg-muted/70" />
          <div className="h-3 w-5/6 rounded bg-muted/70" />
          <div className="h-3 w-2/3 rounded bg-muted/70" />
        </div>
        <div className="flex gap-1.5 pt-2">
          <div className="h-4 w-12 rounded bg-muted" />
          <div className="h-4 w-14 rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-border/40 flex justify-between">
        <div className="h-3 w-20 rounded bg-muted/50" />
        <div className="h-3 w-16 rounded bg-muted/50" />
      </div>
    </Card>
  );
}
