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

  let currentPath = "";

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs text-muted-foreground">
      <ol className="flex items-center gap-1.5 flex-wrap">
        <li>
          <Link
            href={segments[0] === "faculty" ? "/faculty/dashboard" : "/dashboard"}
            className="hover:text-foreground transition-colors"
          >
            Home
          </Link>
        </li>

        {segments.map((segment, index) => {
          currentPath += `/${segment}`;
          const isLast = index === segments.length - 1;
          const label = SEGMENT_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

          return (
            <li key={currentPath} className="flex items-center gap-1.5">
              <ChevronRight className="size-3 text-muted-foreground/60" aria-hidden="true" />
              {isLast ? (
                <span className="font-medium text-foreground" aria-current="page">
                  {label}
                </span>
              ) : (
                <Link
                  href={currentPath}
                  className="hover:text-foreground transition-colors"
                >
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
