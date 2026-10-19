import type { ProgressStatus } from "@/contracts/common";
import { Circle, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface StatusMeta {
  status: ProgressStatus;
  label: string;
  badgeText: string;
  colorClass: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  ringClass: string;
  strokeColor: string;
  Icon: LucideIcon;
}

export const STATUS_META: Record<ProgressStatus, StatusMeta> = {
  not_started: {
    status: "not_started",
    label: "Not Started",
    badgeText: "0%",
    colorClass: "text-status-not-started",
    borderClass: "border-status-not-started",
    bgClass: "bg-status-not-started",
    textClass: "text-status-not-started",
    ringClass: "ring-status-not-started",
    strokeColor: "var(--color-status-not-started)",
    Icon: Circle,
  },
  low: {
    status: "low",
    label: "Low Mastery",
    badgeText: "< 40%",
    colorClass: "text-status-low",
    borderClass: "border-status-low",
    bgClass: "bg-status-low",
    textClass: "text-status-low",
    ringClass: "ring-status-low",
    strokeColor: "var(--color-status-low)",
    Icon: AlertCircle,
  },
  in_progress: {
    status: "in_progress",
    label: "In Progress",
    badgeText: "40–75%",
    colorClass: "text-status-in-progress",
    borderClass: "border-status-in-progress",
    bgClass: "bg-status-in-progress",
    textClass: "text-status-in-progress",
    ringClass: "ring-status-in-progress",
    strokeColor: "var(--color-status-in-progress)",
    Icon: Clock,
  },
  mastered: {
    status: "mastered",
    label: "Mastered",
    badgeText: "> 75%",
    colorClass: "text-status-mastered",
    borderClass: "border-status-mastered",
    bgClass: "bg-status-mastered",
    textClass: "text-status-mastered",
    ringClass: "ring-status-mastered",
    strokeColor: "var(--color-status-mastered)",
    Icon: CheckCircle2,
  },
};

export function getStatusMeta(status: ProgressStatus): StatusMeta {
  return STATUS_META[status] ?? STATUS_META.not_started;
}
