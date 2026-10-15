"use client";

import { Bell, Search } from "lucide-react";
import type { Viewer } from "@/contracts/auth";
import type { Semester } from "@/contracts/curriculum";
import type { SemesterNumber } from "@/contracts/common";
import { useQuickSwitcher } from "@/stores/useQuickSwitcher";
import { SemesterSwitcher } from "./SemesterSwitcher";
import { TopNavBar, type NavItem } from "./TopNavBar";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";

interface StudentTopNavProps {
  viewer: Viewer;
  semesters: Semester[];
  selectedSemester: SemesterNumber;
}

const NAV_LINKS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/graph", label: "Graph View" },
  { href: "/subjects", label: "Subjects" },
  { href: "/notes", label: "My Notes" },
  { href: "/assignments", label: "Assignments" },
  { href: "/tutor", label: "AI Tutor" },
  { href: "/practice", label: "Practice" },
];

export function StudentTopNav({ viewer, semesters, selectedSemester }: StudentTopNavProps) {
  const openQuickSwitcher = useQuickSwitcher((s) => s.open);

  return (
    <TopNavBar homeHref="/dashboard" links={NAV_LINKS}>
      <SemesterSwitcher semesters={semesters} selectedSemester={selectedSemester} />

      <button
        type="button"
        onClick={openQuickSwitcher}
        aria-label="Search syllabus and notes (Ctrl+K)"
        className="text-label border-border text-muted-foreground hover:bg-muted hover:text-foreground hidden cursor-pointer items-center gap-2 border px-2 py-1.5 transition-colors xl:flex"
      >
        <Search className="size-3.5" />
        <span>Search</span>
        <span aria-hidden="true">Ctrl K</span>
      </button>

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Notifications"
        className="text-muted-foreground hover:text-foreground"
      >
        <Bell className="size-4" />
      </Button>

      <UserMenu viewer={viewer} profileHref="/profile" />
    </TopNavBar>
  );
}
