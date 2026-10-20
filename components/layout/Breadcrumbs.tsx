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
      className="text-label border-border text-muted-foreground flex items-center justify-between border-b px-4 py-2 sm:px-6"
    >
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link
            href={segments[0] === "faculty" ? "/faculty/dashboard" : "/dashboard"}
            className="hover:text-foreground transition-colors"
          >
            INDEX
          </Link>
        </li>

        {segments.map((segment, index) => {
          const currentPath = `/${segments.slice(0, index + 1).join("/")}`;
          const isLast = index === segments.length - 1;
          const rawLabel = SEGMENT_LABELS[segment] || segment;
          const label = rawLabel.toUpperCase();

          return (
            <li key={currentPath} className="flex items-center gap-2">
              <span className="text-border select-none" aria-hidden="true">/</span>
              {isLast ? (
                <span className="text-foreground font-semibold" aria-current="page">
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
      <div className="hidden items-center gap-3 sm:flex">
        <span className="text-border font-mono text-[11px] tracking-widest select-none">
          SYS.V1 // BLUEPRINT
        </span>
      </div>
    </nav>
  );
}
