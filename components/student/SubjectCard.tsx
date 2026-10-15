"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, ChevronRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import type { SubjectDetail } from "@/contracts/curriculum";
import type { ProgressStatus } from "@/contracts/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { progressStatusMeta } from "@/components/ui/status";
import { cn } from "@/lib/utils";

interface SubjectCardProps {
  subject: SubjectDetail;
  percent: number;
  status: ProgressStatus;
  prerequisiteNames: string[];
  unitProgressMap: Record<string, { percent: number; status: ProgressStatus }>;
}

export function SubjectCard({
  subject,
  percent,
  status,
  prerequisiteNames,
  unitProgressMap,
}: SubjectCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const meta = progressStatusMeta[status] ?? progressStatusMeta.not_started;
  const totalTopics = subject.units.reduce((acc, u) => acc + u.topics.length, 0);

  return (
    <Card className="transition-all hover:ring-foreground/20">
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs font-semibold">
                {subject.code}
              </Badge>
              {prerequisiteNames.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  Requires: {prerequisiteNames.join(", ")}
                </span>
              )}
            </div>
            <CardTitle className="text-lg font-semibold tracking-tight">
              {subject.name}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                meta.bg,
                meta.text
              )}
            >
              <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
              {meta.label} · {Math.round(percent)}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.round(percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${subject.name} progress: ${Math.round(percent)}%`}
          >
            <div
              className={cn("h-full transition-all duration-500", meta.bg)}
              style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {subject.units.length} {subject.units.length === 1 ? "unit" : "units"} · {totalTopics} topics
            </span>
            <span>{Math.round(percent)}% covered</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse units list" : "Expand units list"}
          >
            {isExpanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
            <span>Syllabus Units ({subject.units.length})</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
           render={<Link href="/graph" />}>
              <span>View in Graph</span>
              <ArrowUpRight className="size-3.5" />
            </Button>
        </div>

        {isExpanded && (
          <ul className="divide-y divide-border/40 rounded-lg border border-border/60 bg-muted/20">
            {subject.units.map((unit) => {
              const uProgress = unitProgressMap[unit.id] ?? { percent: 0, status: "not_started" };
              const uMeta = progressStatusMeta[uProgress.status] ?? progressStatusMeta.not_started;
              const isMastered = uProgress.status === "mastered";

              return (
                <li key={unit.id}>
                  <Link
                    href={`/subjects/${subject.id}/units/${unit.id}`}
                    className="group flex items-center justify-between p-3 text-sm transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-md border text-xs font-medium",
                          isMastered
                            ? "border-status-mastered/40 bg-status-mastered/10 text-status-mastered"
                            : "border-border bg-background text-muted-foreground"
                        )}
                      >
                        {isMastered ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          <span>{unit.order}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground group-hover:text-primary transition-colors">
                          {unit.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {unit.topics.length} {unit.topics.length === 1 ? "topic" : "topics"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          uMeta.bg,
                          uMeta.text
                        )}
                      >
                        {Math.round(uProgress.percent)}%
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
