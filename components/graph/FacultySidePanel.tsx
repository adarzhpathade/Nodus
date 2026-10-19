"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  FileText,
  AlertTriangle,
  Users,
  Download,
  AlertCircle,
  Loader2,
  Calendar,
  Edit,
} from "lucide-react";
import type { FacultySidePanel as FacultySidePanelData } from "@/contracts/graph";
import { getFacultySidePanel } from "@/lib/actions/graph";
import { getResourceAccess } from "@/lib/actions/resources";
import { getStatusMeta } from "./status";
import { spring } from "@/components/motion/tokens";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FacultySidePanelProps {
  unitId: string | null;
  section: string;
  onClose: () => void;
}

export function FacultySidePanel({ unitId, section, onClose }: FacultySidePanelProps) {
  const [data, setData] = useState<FacultySidePanelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  // Fetch faculty side panel data
  useEffect(() => {
    if (!unitId || !section) {
      // Reset when the panel closes; fetch results are applied asynchronously below.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    getFacultySidePanel({ unitId, section })
      .then((res) => {
        if (!active) return;
        if (res.ok) {
          setData(res.data);
        } else {
          setError(res.error.message || "Could not load class unit analytics");
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Error loading class unit analytics");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [unitId, section]);

  if (!unitId) return null;

  return (
    <AnimatePresence>
      <motion.aside
        key="faculty-side-panel"
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={spring.panel}
        aria-label="Class Unit Analytics and Topic Coverage"
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
              FACULTY UNIT ANALYTICS • SEC {section}
            </span>
            <h3 className="font-heading text-base font-semibold uppercase tracking-tight text-foreground truncate mt-0.5">
              {data?.unit.title ?? "Loading Unit Analytics..."}
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
            aria-label="Close analytics panel"
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
              <p className="font-mono text-xs uppercase tracking-wider">Aggregating Class Progress...</p>
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
              {/* Class Mastery Level */}
              <div className="border border-border bg-card p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground uppercase">Class Average</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground">{Math.round(data.averagePercent)}%</span>
                    <Badge variant="outline" className={cn("text-xs uppercase", getStatusMeta(data.status).colorClass)}>
                      {getStatusMeta(data.status).label}
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-border/40 h-1.5">
                  <div
                    className={cn("h-full transition-all duration-500", getStatusMeta(data.status).bgClass)}
                    style={{ width: `${Math.min(100, Math.max(0, data.averagePercent))}%` }}
                  />
                </div>
              </div>

              {/* Edit Topics shortcut button */}
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/faculty/content" />}
                className="w-full justify-center gap-1.5 border-border hover:border-signal text-xs font-mono uppercase"
              >
                <Edit className="size-3.5 text-signal" />
                <span>Edit Unit Topics & Curriculum</span>
              </Button>

              {/* Students Needing Help */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-border pb-1">
                  <span className="text-label text-muted-foreground flex items-center gap-1.5">
                    <AlertTriangle className="size-3 text-status-low" />
                    STUDENTS NEEDING HELP ({data.studentsNeedingHelp.length})
                  </span>
                  <span className="font-mono text-xs text-status-low uppercase">Alert</span>
                </div>

                {data.studentsNeedingHelp.length === 0 ? (
                  <p className="font-mono text-xs text-muted-foreground italic py-2">
                    All students are currently in progress or mastered (&gt; 40%).
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {data.studentsNeedingHelp.map((st) => (
                      <div
                        key={st.studentId}
                        className="flex items-center justify-between border border-border bg-card p-2 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="size-3.5 text-muted-foreground" />
                          <span className="font-medium text-foreground">{st.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-status-low font-bold">{Math.round(st.percent)}%</span>
                          <span className="text-xs uppercase text-status-low">[{st.status}]</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Topic-Wise Class Coverage Bars */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-border pb-1">
                  <span className="text-label text-muted-foreground">
                    TOPIC CLASS COVERAGE ({data.topics.length})
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">% of Section</span>
                </div>

                <div className="space-y-2">
                  {data.topics.map((tp) => (
                    <div key={tp.topicId} className="border border-border bg-card p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground uppercase truncate mr-2">
                          {tp.title}
                        </span>
                        <span className="font-mono font-bold shrink-0">
                          {Math.round(tp.coveragePercent)}%
                        </span>
                      </div>
                      <div className="w-full bg-border/40 h-1">
                        <div
                          className="h-full bg-signal transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, tp.coveragePercent))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assignment Block */}
              {data.assignment ? (
                <div className="border border-border bg-card p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-label text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="size-3 text-signal" />
                      SECTION ASSIGNMENT
                    </span>
                    <Badge variant="outline" className="text-xs font-mono text-status-low">
                      {data.assignment.pendingCount} Pending
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-heading text-xs font-semibold uppercase text-foreground">
                      {data.assignment.title}
                    </h4>
                    <p className="font-mono text-xs text-muted-foreground mt-0.5">
                      Due: {new Date(data.assignment.dueAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    render={<Link href={`/faculty/assignments/${data.assignment.id}`} />}
                    className="w-full mt-2 font-mono text-xs uppercase"
                  >
                    Open Grading Table
                  </Button>
                </div>
              ) : null}

              {/* Faculty Uploaded Resources */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-border pb-1">
                  <span className="text-label text-muted-foreground">
                    UPLOADED MATERIALS ({data.resources.length})
                  </span>
                </div>

                {data.resources.length === 0 ? (
                  <p className="font-mono text-xs text-muted-foreground italic py-2">
                    No resources uploaded for this unit yet.
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
