"use client";

import { motion, AnimatePresence } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import { Calendar, FileText, Brain, CheckSquare, Square, AlertTriangle, Users } from "lucide-react";
import type { StudentHoverCard, FacultyHoverCard } from "@/contracts/graph";
import { getStatusMeta } from "./status";
import { spring } from "@/components/motion/tokens";
import { cn } from "@/lib/utils";

interface HoverCardProps {
  card: StudentHoverCard | FacultyHoverCard | null;
  position: { x: number; y: number } | null;
}

function isFacultyCard(card: StudentHoverCard | FacultyHoverCard): card is FacultyHoverCard {
  return "averagePercent" in card;
}

export function HoverCard({ card, position }: HoverCardProps) {
  if (!card || !position) return null;

  const isFaculty = isFacultyCard(card);
  const percent = isFaculty ? card.averagePercent : card.percent;
  const meta = getStatusMeta(card.status);
  const StatusIcon = meta.Icon;

  return (
    <AnimatePresence>
      <motion.div
        key={card.id}
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={spring.pop}
        style={{
          position: "fixed",
          left: Math.min(position.x + 16, window.innerWidth - 320),
          top: Math.min(position.y - 12, window.innerHeight - 380),
          pointerEvents: "none",
          zIndex: 100,
        }}
        className={cn(
          "w-72 border border-border bg-foreground text-background p-3.5 select-none",
          "font-mono text-xs shadow-pop"
        )}
      >
        {/* Title & Status */}
        <div className="flex items-start justify-between gap-2 border-b border-background/25 pb-2">
          <div className="min-w-0">
            <span className="text-xs text-background/60 tracking-wider uppercase block">
              {isFaculty
                ? `Unit (Sec ${card.section})`
                : card.kind === "subject"
                ? "Subject Summary"
                : "Unit Summary"}
            </span>
            <h4 className="font-heading text-sm font-semibold text-background uppercase truncate mt-0.5">
              {card.title}
            </h4>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center justify-end gap-1">
              <StatusIcon className="size-3 text-background" />
              <span className="font-bold text-sm text-background">
                {Math.round(percent)}%
              </span>
            </div>
            <span className="text-xs uppercase tracking-wider text-background/70">
              {meta.label}
            </span>
          </div>
        </div>

        {/* Variant: Faculty Unit */}
        {isFaculty ? (
          <div className="mt-2.5 space-y-2.5">
            {/* Status Bands Breakdown */}
            <div>
              <span className="text-xs text-background/60 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                <Users className="size-3" />
                Student Distribution
              </span>
              <div className="grid grid-cols-4 gap-1 text-center text-xs">
                <div className="border border-background/20 p-1">
                  <span className="text-status-not-started block font-bold">{card.bands.notStarted}</span>
                  <span className="text-xs text-background/60">0%</span>
                </div>
                <div className="border border-background/20 p-1">
                  <span className="text-status-low block font-bold">{card.bands.low}</span>
                  <span className="text-xs text-background/60">LOW</span>
                </div>
                <div className="border border-background/20 p-1">
                  <span className="text-status-in-progress block font-bold">{card.bands.inProgress}</span>
                  <span className="text-xs text-background/60">MID</span>
                </div>
                <div className="border border-background/20 p-1">
                  <span className="text-status-mastered block font-bold">{card.bands.mastered}</span>
                  <span className="text-xs text-background/60">MAST</span>
                </div>
              </div>
            </div>

            {/* Weakest Topic */}
            {card.weakestTopic && (
              <div className="border-t border-background/20 pt-2 flex items-start gap-1.5 text-xs">
                <AlertTriangle className="size-3.5 text-status-low shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-background/60 block">Weakest Topic:</span>
                  <span className="text-background font-medium">
                    {card.weakestTopic.title} ({Math.round(card.weakestTopic.coveragePercent)}%)
                  </span>
                </div>
              </div>
            )}

            {/* Quiz Average */}
            <div className="border-t border-background/20 pt-1.5 flex items-center justify-between text-background/80 text-xs">
              <span className="flex items-center gap-1">
                <Brain className="size-3 text-background/60" />
                Class Quiz Average:
              </span>
              <span className="font-bold">
                {card.quizAverage !== null ? `${Math.round(card.quizAverage)}%` : "N/A"}
              </span>
            </div>
          </div>
        ) : card.kind === "subject" ? (
          /* Variant: Student Subject */
          <div className="mt-2.5 space-y-2">
            <div className="flex items-center justify-between text-background/90 text-xs">
              <span className="flex items-center gap-1.5">
                <FileText className="size-3 text-background/70" />
                Units Completed:
              </span>
              <span className="font-bold">
                {card.completedUnits} / {card.unitCount}
              </span>
            </div>
            {card.nextDeadline ? (
              <div className="border-t border-background/20 pt-2 flex items-center gap-1.5 text-background/90 text-xs">
                <Calendar className="size-3 text-signal" />
                <span className="truncate flex-1">
                  {card.nextDeadline.title}
                </span>
                <span className="text-xs text-background/60 shrink-0">
                  due {formatDistanceToNow(new Date(card.nextDeadline.dueAt), { addSuffix: true })}
                </span>
              </div>
            ) : (
              <div className="border-t border-background/20 pt-1.5 text-xs text-background/60">
                No pending assignment deadlines
              </div>
            )}
          </div>
        ) : (
          /* Variant: Student Unit */
          <div className="mt-2.5 space-y-2.5">
            {/* Topic checklist */}
            <div className="space-y-1">
              <span className="text-xs text-background/60 uppercase tracking-wider block">
                Syllabus Topics
              </span>
              <div className="space-y-1 max-h-28 overflow-hidden">
                {card.topics.slice(0, 5).map((topic) => (
                  <div key={topic.id} className="flex items-center gap-1.5 text-xs">
                    {topic.covered ? (
                      <CheckSquare className="size-3 text-status-mastered shrink-0" />
                    ) : (
                      <Square className="size-3 text-background/40 shrink-0" />
                    )}
                    <span className={cn("truncate", topic.covered ? "text-background" : "text-background/60")}>
                      {topic.title}
                    </span>
                  </div>
                ))}
                {card.topics.length > 5 && (
                  <span className="text-xs text-background/50 pl-4 block">
                    +{card.topics.length - 5} more topics
                  </span>
                )}
              </div>
            </div>

            {/* Metrics */}
            <div className="border-t border-background/20 pt-2 flex items-center justify-between text-background/80 text-xs">
              <span className="flex items-center gap-1">
                <FileText className="size-3 text-background/60" />
                {card.noteCount} notes
              </span>
              <span className="flex items-center gap-1">
                <Brain className="size-3 text-background/60" />
                Quiz: {card.quizAverage !== null ? `${Math.round(card.quizAverage)}%` : "Not taken"}
              </span>
            </div>

            {/* Assignment */}
            {card.nextDeadline && (
              <div className="border-t border-background/20 pt-1.5 flex items-center gap-1.5 text-xs text-background/90">
                <Calendar className="size-3 text-signal" />
                <span className="truncate flex-1">{card.nextDeadline.title}</span>
                <span className="text-xs text-background/60">
                  {formatDistanceToNow(new Date(card.nextDeadline.dueAt), { addSuffix: true })}
                </span>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
