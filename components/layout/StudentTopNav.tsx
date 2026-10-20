"use client";

import type { Viewer } from "@/contracts/auth";
import type { Semester } from "@/contracts/curriculum";
import type { SemesterNumber } from "@/contracts/common";
import { TopNavBar, type NavItem } from "./TopNavBar";

interface StudentTopNavProps {
  viewer: Viewer;
  semesters: Semester[];
  selectedSemester: SemesterNumber;
}

const NAV_LINKS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  {
    label: "Syllabus",
    children: [
      { href: "/graph", label: "Graph View" },
      { href: "/subjects", label: "Subjects" },
    ],
  },
  {
    label: "Workspace",
    children: [
      { href: "/notes", label: "My Notes" },
      { href: "/assignments", label: "Assignments" },
    ],
  },
  {
    label: "AI & Practice",
    children: [
      { href: "/tutor", label: "AI Tutor" },
      { href: "/practice", label: "Practice" },
    ],
  },
];

export function StudentTopNav({ viewer: _viewer, semesters: _semesters, selectedSemester: _selectedSemester }: StudentTopNavProps) {
  return (
    <TopNavBar homeHref="/dashboard" links={NAV_LINKS} />
  );
}
