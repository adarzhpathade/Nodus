"use client";

import { Bell } from "lucide-react";
import type { FacultySelection, TeachingAssignment, Viewer } from "@/contracts/auth";
import { SubjectSectionSwitcher } from "./SubjectSectionSwitcher";
import { TopNavBar, type NavItem } from "./TopNavBar";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";

interface FacultyTopNavProps {
  viewer: Viewer;
  teaches: TeachingAssignment[];
  selection: FacultySelection | null;
}

const NAV_LINKS: NavItem[] = [
  { href: "/faculty/dashboard", label: "Dashboard" },
  { href: "/faculty/graph", label: "Graph View" },
  { href: "/faculty/content", label: "Content" },
  { href: "/faculty/assignments", label: "Assignments" },
  { href: "/faculty/tracker", label: "Tracker" },
];

export function FacultyTopNav({ viewer, teaches, selection }: FacultyTopNavProps) {
  return (
    <TopNavBar homeHref="/faculty/dashboard" tag="Faculty" links={NAV_LINKS}>
      <SubjectSectionSwitcher teaches={teaches} initialSelection={selection} />

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Notifications"
        className="border-border text-muted-foreground hover:text-foreground relative border"
      >
        <Bell className="size-3.5" />
      </Button>

      <UserMenu viewer={viewer} profileHref="/faculty/profile" />
    </TopNavBar>
  );
}
