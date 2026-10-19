"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  FileText,
  Plus,
  Bot,
  Brain,
  Clock,
  Download,
  CheckSquare,
  Square,
  AlertCircle,
  Loader2,
  Calendar,
} from "lucide-react";
import type { StudentSidePanel } from "@/contracts/graph";
import { getStudentSidePanel } from "@/lib/actions/graph";
import { getResourceAccess } from "@/lib/actions/resources";
import { createNote } from "@/lib/actions/notes";
import { getStatusMeta } from "./status";
import { spring } from "@/components/motion/tokens";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SidePanelProps {
  unitId: string | null;
  onClose: () => void;
}

export function SidePanel({ unitId, onClose }: SidePanelProps) {
  const router = useRouter();
  const [data, setData] = useState<StudentSidePanel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPendingNote, startNoteTransition] = useTransition();
  const [openingResourceId, setOpeningResourceId] = useState<string | null>(null);
  const [resourceErrorId, setResourceErrorId] = useState<string | null>(null);

  const handleOpenResource = async (resourceId: string) => {
    if (openingResourceId) return;
    setOpeningResourceId(resourceId);
    setResourceErrorId(null);

    try {
      const res = await getResourceAccess({ resourceId });
      if (res.ok) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      } else {
        setResourceErrorId(resourceId);
      }
    } catch {
      setResourceErrorId(resourceId);
    } finally {
      setOpeningResourceId(null);
    }
  };

  // Close on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Fetch unit side panel data whenever unitId changes
  useEffect(() => {
    if (!unitId) {
      // Reset when the panel closes; fetch results are applied asynchronously below.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    getStudentSidePanel({ unitId })
      .then((res) => {
        if (!active) return;
        if (res.ok) {
          setData(res.data);
        } else {
          setError(res.error.message || "Could not load unit details");
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Error loading unit details");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [unitId]);

  const handleAddNote = (topicId: string, topicTitle: string) => {
    startNoteTransition(async () => {
      const res = await createNote({ topicId, title: `Notes: ${topicTitle}` });
      if (res.ok && res.data.id) {
        router.push(`/notes/${res.data.id}`);
      }
    });
  };

  if (!unitId) return null;

  return (
    <AnimatePresence>
      <motion.aside
        key="student-side-panel"
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={spring.panel}
        aria-label="Unit Syllabus and Resource Details"
        className={cn(
          "fixed top-0 right-0 z-40 h-full w-full max-w-md border-l border-border bg-popover text-foreground",
          "flex flex-col shadow-[-4px_0_12px_rgba(0,0,0,0.05)] pt-16 md:pt-0"
        )}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-background">
          <div className="min-w-0 pr-2">
            <span className="text-label text-muted-foreground flex items-center gap-1.5">
              <span className="size-1.5 bg-signal shrink-0" aria-hidden="true" />
              UNIT DETAILS
            </span>
            <h3 className="font-heading text-base font-semibold uppercase tracking-tight text-foreground truncate mt-0.5">
              {data?.unit.title ?? "Loading Unit..."}
            </h3>
            {data?.unit.subjectName && (
              <p className="font-mono text-xs text-muted-foreground">
                {data.unit.subjectName}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close unit panel"
            className="shrink-0 border border-border"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Panel Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-6 animate-spin mb-3 text-signal" />
              <p className="font-mono text-xs uppercase tracking-wider">Fetching Unit Material...</p>
            </div>
          ) : error ? (
            <div className="border border-destructive/40 bg-destructive/10 p-4 text-destructive space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span className="font-mono text-xs font-semibold uppercase">Failed to load</span>
              </div>
              <p className="text-xs">{error}</p>
            </div>
          ) : data ? (
            <>
              {/* Unit Progress Summary */}
              <div className="border border-border bg-card p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground uppercase">Mastery Level</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground">{Math.round(data.progress.percent)}%</span>
                    <Badge variant="outline" className={cn("text-xs uppercase", getStatusMeta(data.progress.status).colorClass)}>
                      {getStatusMeta(data.progress.status).label}
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-border/40 h-1.5">
                  <div
                    className={cn("h-full transition-all duration-500", getStatusMeta(data.progress.status).bgClass)}
                    style={{ width: `${Math.min(100, Math.max(0, data.progress.percent))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between pt-1 text-xs font-mono text-muted-foreground">
                  <span>Covered: {data.progress.coveredTopics} / {data.progress.totalTopics} topics</span>
                  {data.progress.quizAverage !== null && (
                    <span>Quiz Avg: {Math.round(data.progress.quizAverage)}%</span>
                  )}
                </div>
              </div>

              {/* Action Buttons: Ask AI & Practice */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <Link href={`/tutor?unit=${data.unit.id}`} />
                  }
                  className="w-full justify-center gap-1.5 border-border hover:border-signal hover:text-signal text-xs font-mono uppercase"
                >
                  <Bot className="size-3.5 text-signal" />
                  <span>Ask AI Tutor</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <Link href={`/practice?unit=${data.unit.id}`} />
                  }
                  className="w-full justify-center gap-1.5 border-border hover:border-signal hover:text-signal text-xs font-mono uppercase"
                >
                  <Brain className="size-3.5 text-signal" />
                  <span>Practice Quiz</span>
                </Button>
              </div>

              {/* Assignment Block */}
              {data.assignment ? (
                <div className="border border-border bg-card p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-label text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="size-3 text-signal" />
                      UPCOMING ASSIGNMENT
                    </span>
                    <Badge variant="outline" className="text-xs font-mono uppercase">
                      {data.assignment.status}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-heading text-xs font-semibold uppercase text-foreground">
                      {data.assignment.title}
                    </h4>
                    <p className="font-mono text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="size-3" />
                      Due {new Date(data.assignment.dueAt).toLocaleDateString()} at{" "}
                      {new Date(data.assignment.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border border-border/60 bg-muted/20 p-3 text-center font-mono text-xs text-muted-foreground">
                  No active assignments for this unit
                </div>
              )}

              {/* Topic Checklist */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-border pb-1">
                  <span className="text-label text-muted-foreground">
                    SYLLABUS TOPICS ({data.progress.topics.length})
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {data.progress.coveredTopics} Covered
                  </span>
                </div>

                <div className="space-y-2">
                  {data.progress.topics.map((t) => (
                    <div
                      key={t.topicId}
                      className={cn(
                        "border border-border bg-card p-2.5 transition-colors",
                        t.covered ? "hover:border-status-mastered/60" : "hover:border-border"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          {t.covered ? (
                            <CheckSquare className="size-4 text-status-mastered shrink-0 mt-0.5" />
                          ) : (
                            <Square className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="font-medium text-xs text-foreground uppercase block">
                              {t.title}
                            </span>
                            <div className="mt-1 flex items-center gap-2 font-mono text-xs text-muted-foreground">
                              <span>{t.noteCount} notes</span>
                              {t.bestQuizScore !== null && (
                                <span>• Quiz best: {Math.round(t.bestQuizScore)}%</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Add note button */}
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={isPendingNote}
                          onClick={() => handleAddNote(t.topicId, t.title)}
                          aria-label={`Add note for ${t.title}`}
                          className="font-mono text-xs uppercase border border-border shrink-0 hover:border-signal"
                        >
                          <Plus className="size-2.5 mr-1" />
                          {t.noteCount === 0 ? "Add note" : "New note"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Faculty Uploaded Resources */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-border pb-1">
                  <span className="text-label text-muted-foreground">
                    FACULTY MATERIAL ({data.resources.length})
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">Official</span>
                </div>

                {data.resources.length === 0 ? (
                  <p className="font-mono text-xs text-muted-foreground italic py-2">
                    No faculty uploads yet for this unit.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {data.resources.map((res) => (
                      <div
                        key={res.id}
                        className="flex flex-col gap-1 border border-border bg-card p-2 text-xs font-mono"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 truncate min-w-0 mr-2">
                            <FileText className="size-3.5 text-signal shrink-0" />
                            <span className="truncate text-foreground">{res.fileName}</span>
                            <span className="text-xs text-muted-foreground uppercase shrink-0">
                              [{res.type}]
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleOpenResource(res.id)}
                            disabled={openingResourceId === res.id}
                            aria-label={`Open ${res.fileName}`}
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                          >
                            {openingResourceId === res.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Download className="size-3.5" />
                            )}
                          </Button>
                        </div>
                        {resourceErrorId === res.id && (
                          <p className="text-xs text-destructive">
                            Failed to generate download link.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
