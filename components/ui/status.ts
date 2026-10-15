// Progress + assignment status → label and token classes. Status values come from the backend
// (lib/progress decides the band); the UI only maps them to tokens. Never rely on color alone:
// always render the label or an icon next to the color (AGENTS.md §15).
import type { AssignmentStatus } from "@/contracts/assignments";
import type { ProgressStatus } from "@/contracts/common";

export const progressStatusMeta: Record<ProgressStatus, { label: string; text: string; bg: string; stroke: string }> = {
  not_started: {
    label: "Not started",
    text: "text-status-not-started",
    bg: "bg-status-not-started",
    stroke: "stroke-status-not-started",
  },
  low: { label: "Low", text: "text-status-low", bg: "bg-status-low", stroke: "stroke-status-low" },
  in_progress: {
    label: "In progress",
    text: "text-status-in-progress",
    bg: "bg-status-in-progress",
    stroke: "stroke-status-in-progress",
  },
  mastered: { label: "Mastered", text: "text-status-mastered", bg: "bg-status-mastered", stroke: "stroke-status-mastered" },
};

export const assignmentStatusMeta: Record<AssignmentStatus, { label: string; badge: string }> = {
  pending: { label: "Pending", badge: "bg-muted text-muted-foreground" },
  submitted: { label: "Submitted", badge: "bg-success text-success-foreground" },
  late: { label: "Late", badge: "bg-warning text-warning-foreground" },
  not_submitted: { label: "Not submitted", badge: "bg-destructive text-primary-foreground" },
};
