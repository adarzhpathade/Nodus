import Link from "next/link";
import { formatDistanceToNow, isPast, parseISO } from "date-fns";
import { Calendar, Clock, ArrowRight, CheckCircle2, AlertCircle, FileCheck } from "lucide-react";
import type { UpcomingDeadline } from "@/contracts/graph";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { assignmentStatusMeta } from "@/components/ui/status";
import { cn } from "@/lib/utils";

interface UnitAssignmentCardProps {
  assignment: UpcomingDeadline | null;
}

export function UnitAssignmentCard({ assignment }: UnitAssignmentCardProps) {
  if (!assignment) {
    return (
      <Card className="border-dashed border-border/80 bg-card/50">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          <FileCheck className="size-8 mx-auto text-muted-foreground/60 mb-2" />
          <p className="font-medium">No assignment for this unit</p>
          <p className="text-xs text-muted-foreground/80 mt-0.5">
            When faculty assigns coursework for this unit, it will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const dueDate = parseISO(assignment.dueAt);
  const overdue = isPast(dueDate);
  const statusMeta = assignmentStatusMeta[assignment.status] ?? assignmentStatusMeta.pending;

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                statusMeta.badge
              )}
            >
              {statusMeta.label}
            </span>
            <span className="text-xs text-muted-foreground">
              Offline paper submission
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            <span>
              {overdue
                ? `Due ${formatDistanceToNow(dueDate, { addSuffix: true })}`
                : `Due in ${formatDistanceToNow(dueDate)}`}
            </span>
          </div>
        </div>
        <CardTitle className="text-base font-semibold text-foreground pt-1">
          {assignment.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <p className="text-xs text-muted-foreground">
          Submissions are collected in class on paper by your professor. Check status and grading notes on the assignments page.
        </p>

        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <span className="text-xs text-muted-foreground">
            Due {new Date(assignment.dueAt).toLocaleDateString()}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs text-primary hover:text-primary/90"
           render={<Link href="/assignments" />}>
              <span>View all assignments</span>
              <ArrowRight className="size-3.5" />
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
