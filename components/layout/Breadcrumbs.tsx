"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  graph: "Graph View",
  subjects: "Subjects",
  units: "Units",
  notes: "My Notes",
  assignments: "Assignments",
  tutor: "AI Tutor",
  practice: "Practice",
  profile: "Profile",
  faculty: "Faculty",
  content: "Content",
  tracker: "Tracker",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="text-label border-border text-muted-foreground border-b px-4 py-2.5 sm:px-6"
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link
            href={segments[0] === "faculty" ? "/faculty/dashboard" : "/dashboard"}
            className="hover:text-foreground transition-colors"
          >
            Home
          </Link>
        </li>

        {segments.map((segment, index) => {
          const currentPath = `/${segments.slice(0, index + 1).join("/")}`;
          const isLast = index === segments.length - 1;
          const label = SEGMENT_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

          return (
            <li key={currentPath} className="flex items-center gap-1.5">
              <ChevronRight className="text-muted-foreground/60 size-3" aria-hidden="true" />
              {isLast ? (
                <span className="text-foreground" aria-current="page">
                  {label}
                </span>
              ) : (
                <Link href={currentPath} className="hover:text-foreground transition-colors">
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
