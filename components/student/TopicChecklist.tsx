import Link from "next/link";
import { CheckCircle2, Circle, FileText, HelpCircle, Plus } from "lucide-react";
import type { TopicProgress } from "@/contracts/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NewNoteButton } from "@/components/student/NewNoteButton";
import { cn } from "@/lib/utils";

interface TopicChecklistProps {
  topics: TopicProgress[];
  unitId: string;
}

export function TopicChecklist({ topics, unitId }: TopicChecklistProps) {
  if (topics.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">
        No topics defined for this unit yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border/60 rounded-xl border border-border/80 bg-card overflow-hidden">
        {topics.map((topic, index) => {
          const isCovered = topic.covered;
          const hasNotes = topic.noteCount > 0;

          return (
            <li
              key={topic.topicId}
              className={cn(
                "flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between",
                isCovered ? "bg-card" : "bg-muted/10 hover:bg-muted/30"
              )}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="pt-0.5 shrink-0">
                  {isCovered ? (
                    <CheckCircle2
                      className="size-5 text-status-mastered"
                      aria-label="Topic covered"
                    />
                  ) : (
                    <Circle
                      className="size-5 text-muted-foreground/60"
                      aria-label="Topic not covered"
                    />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      #{index + 1}
                    </span>
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {topic.title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-medium",
                        isCovered
                          ? "bg-status-mastered/10 text-status-mastered"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isCovered ? "Covered" : "Needs notes or quiz"}
                    </span>

                    <span>·</span>

                    <span className="inline-flex items-center gap-1">
                      <FileText className="size-3 text-muted-foreground" />
                      {topic.noteCount} {topic.noteCount === 1 ? "note" : "notes"}
                    </span>

                    {topic.bestQuizScore !== null && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <HelpCircle className="size-3 text-muted-foreground" />
                          Best quiz: {Math.round(topic.bestQuizScore)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:shrink-0">
                {hasNotes ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs font-medium"
                      render={<Link href={`/notes?topic=${topic.topicId}`} />}
                    >
                      <FileText className="size-3.5" />
                      <span>View ({topic.noteCount})</span>
                    </Button>
                    <NewNoteButton
                      topicId={topic.topicId}
                      variant="ghost"
                      size="icon-sm"
                      className="size-8"
                    >
                      <Plus className="size-3.5" />
                    </NewNoteButton>
                  </div>
                ) : (
                  <NewNoteButton
                    topicId={topic.topicId}
                    variant="secondary"
                    size="sm"
                    className="h-8 gap-1.5 text-xs font-medium"
                  />
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
                 render={<Link href={`/practice?unitId=${unitId}&topicId=${topic.topicId}`} />}>
                    Quiz
                  </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
