"use client";

import Link from "next/link";
import { Link2, FileText, ChevronRight } from "lucide-react";
import type { Backlink } from "@/contracts/notes";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { cn } from "@/lib/utils";

interface BacklinksPanelProps {
  backlinks: Backlink[];
  className?: string;
}

export function BacklinksPanel({ backlinks, className }: BacklinksPanelProps) {
  return (
    <div className={cn("space-y-3 rounded-xl border border-border/80 bg-card p-4", className)}>
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Link2 className="size-4 text-primary" />
          <h3 className="font-heading text-sm font-semibold text-foreground">
            Backlinks
          </h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
            {backlinks.length}
          </span>
        </div>
      </div>

      {backlinks.length === 0 ? (
        <div className="py-4 text-center text-xs text-muted-foreground">
          No other notes link to this note yet. Use the link picker or &apos;[[&apos; in other notes to connect them.
        </div>
      ) : (
        <Stagger className="space-y-2">
          {backlinks.map((link) => (
            <StaggerItem key={link.noteId}>
              <Link
                href={`/notes/${link.noteId}`}
                className="group block rounded-lg border border-border/60 bg-muted/20 p-2.5 transition-all hover:border-foreground/30 hover:bg-muted/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileText className="size-3.5 text-primary shrink-0" />
                    <span className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {link.noteTitle}
                    </span>
                  </div>
                  <ChevronRight className="size-3 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>

                <div className="mt-1 text-[10px] text-muted-foreground font-mono truncate">
                  {[link.location.subjectName, link.location.unitTitle, link.location.topicTitle]
                    .filter(Boolean)
                    .join(" › ")}
                </div>

                {link.snippet && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground/90 line-clamp-2 italic bg-background/50 rounded p-1.5 border border-border/40">
                    &quot;{link.snippet}&quot;
                  </p>
                )}
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
