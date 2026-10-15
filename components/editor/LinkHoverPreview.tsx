"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { FileText, Layers, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { parseNoteLinkHref, type LinkPreview, type LinkTarget } from "@/contracts/notes";
import { getLinkPreview } from "@/lib/actions/notes";
import { spring } from "@/components/motion/tokens";

interface LinkHoverPreviewProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function LinkHoverPreview({ containerRef }: LinkHoverPreviewProps) {
  const [hoveredTarget, setHoveredTarget] = useState<LinkTarget | null>(null);
  const [fetchedPreview, setPreview] = useState<LinkPreview | null>(null);
  // Which target the last request finished for; "loading" is derived from it instead of set in the effect.
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const targetKey = hoveredTarget ? `${hoveredTarget.type}:${hoveredTarget.id}` : null;
  const loading = targetKey !== null && settledKey !== targetKey;
  const preview =
    fetchedPreview && `${fetchedPreview.target.type}:${fetchedPreview.target.id}` === targetKey
      ? fetchedPreview
      : null;
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      const parsed = parseNoteLinkHref(href);
      if (!parsed) return;

      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      const rect = target.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: Math.max(16, rect.left),
      });
      setHoveredTarget(parsed);
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      hideTimeoutRef.current = setTimeout(() => {
        setHoveredTarget(null);
        setPreview(null);
      }, 250);
    };

    container.addEventListener("mouseover", handleMouseOver);
    container.addEventListener("mouseout", handleMouseOut);

    return () => {
      container.removeEventListener("mouseover", handleMouseOver);
      container.removeEventListener("mouseout", handleMouseOut);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [containerRef]);

  // Fetch preview data when target changes
  useEffect(() => {
    if (!hoveredTarget) return;

    let isCurrent = true;

    getLinkPreview(hoveredTarget)
      .then((res) => {
        if (isCurrent && res.ok) {
          setPreview(res.data);
        }
      })
      .catch(() => {
        // Ignore preview fetch failure
      })
      .finally(() => {
        if (isCurrent) setSettledKey(targetKey);
      });

    return () => {
      isCurrent = false;
    };
  }, [hoveredTarget, targetKey]);

  if (!hoveredTarget || !position) return null;

  const targetUrl =
    hoveredTarget.type === "note"
      ? `/notes/${hoveredTarget.id}`
      : hoveredTarget.type === "topic"
        ? `/notes?topic=${hoveredTarget.id}`
        : `/notes?unit=${hoveredTarget.id}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={spring.pop}
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
        onMouseEnter={() => {
          if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        }}
        onMouseLeave={() => {
          setHoveredTarget(null);
          setPreview(null);
        }}
        className="fixed z-50 w-72 rounded-xl border border-border bg-popover p-3.5 text-popover-foreground shadow-pop backdrop-blur-md"
      >
        {loading ? (
          <div className="flex items-center justify-center py-4 gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            <span>Loading preview...</span>
          </div>
        ) : preview ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground uppercase">
                {preview.target.type === "note" && <FileText className="size-3 text-primary" />}
                {preview.target.type === "topic" && (
                  <CheckCircle2 className="size-3 text-status-mastered" />
                )}
                {preview.target.type === "unit" && <Layers className="size-3 text-accent-foreground" />}
                <span>{preview.target.type}</span>
              </span>
              <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                {preview.location.subjectName}
              </span>
            </div>

            <h4 className="font-heading text-sm font-semibold text-foreground line-clamp-1">
              {preview.title}
            </h4>

            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              {preview.excerpt || "No summary text available."}
            </p>

            <div className="pt-2 border-t border-border/50 flex justify-end">
              <Link
                href={targetUrl}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <span>Open {preview.target.type}</span>
                <ExternalLink className="size-3" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground py-1">Preview unavailable</div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
