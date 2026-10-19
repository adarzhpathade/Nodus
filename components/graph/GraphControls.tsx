"use client";

import { useState } from "react";
import { useReactFlow } from "@xyflow/react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  Info,
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GraphNode } from "@/contracts/graph";
import { cn } from "@/lib/utils";

interface GraphControlsProps {
  nodes: GraphNode[];
  onFlyToNode: (nodeId: string) => void;
}

export function GraphControls({ nodes, onFlyToNode }: GraphControlsProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [showLegend, setShowLegend] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<GraphNode[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    const lower = term.toLowerCase();
    const matches = nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(lower) ||
        n.kind.toLowerCase().includes(lower)
    );
    setSearchResults(matches.slice(0, 6));
  };

  const handleSelectResult = (nodeId: string) => {
    onFlyToNode(nodeId);
    setSearchTerm("");
    setSearchResults([]);
    setIsSearchOpen(false);
  };

  return (
    <>
      {/* Top Left: In-Graph Search Bar */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-1 w-72">
        <div className="relative flex items-center border border-border bg-card/95 shadow-sm">
          <Search className="size-3.5 text-muted-foreground ml-2.5 shrink-0" />
          <Input
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Search syllabus nodes..."
            aria-label="Search syllabus nodes"
            className="h-8 border-0 bg-transparent text-xs font-mono placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 px-2"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSearchResults([]);
              }}
              aria-label="Clear search"
              className="p-1.5 text-muted-foreground hover:text-foreground mr-1"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && searchResults.length > 0 && (
          <div className="border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden divide-y divide-border/60">
            {searchResults.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleSelectResult(n.id)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted/60 flex items-center justify-between gap-2 cursor-pointer font-mono"
              >
                <div className="truncate">
                  <span className="text-xs uppercase text-muted-foreground mr-1.5 font-bold">
                    [{n.kind}]
                  </span>
                  <span className="font-medium text-foreground">{n.label}</span>
                </div>
                <span className="text-signal text-xs font-bold shrink-0">
                  {Math.round(n.percent)}%
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Left: Controls & Legend Trigger */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 border border-border bg-card/95 p-1 shadow-sm font-mono text-xs">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => zoomIn({ duration: 300 })}
          aria-label="Zoom in"
          className="size-7 border border-transparent hover:border-border"
        >
          <ZoomIn className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => zoomOut({ duration: 300 })}
          aria-label="Zoom out"
          className="size-7 border border-transparent hover:border-border"
        >
          <ZoomOut className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => fitView({ duration: 600, padding: 0.2 })}
          aria-label="Fit view"
          className="size-7 border border-transparent hover:border-border"
        >
          <Maximize2 className="size-3.5" />
        </Button>
        <div className="w-px h-4 bg-border mx-0.5" aria-hidden="true" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowLegend(!showLegend)}
          aria-expanded={showLegend}
          aria-label="Toggle graph legend"
          className={cn(
            "h-7 px-2 text-xs gap-1 border",
            showLegend ? "border-signal text-signal" : "border-transparent hover:border-border"
          )}
        >
          <Info className="size-3" />
          <span>Legend</span>
        </Button>
      </div>

      {/* Legend Modal / Popover */}
      {showLegend && (
        <div className="absolute bottom-16 left-4 z-20 w-72 border border-border bg-popover text-popover-foreground p-3.5 shadow-lg font-mono text-xs select-none">
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5 mb-2.5">
            <span className="text-label text-muted-foreground">GRAPH LEGEND</span>
            <button
              type="button"
              onClick={() => setShowLegend(false)}
              aria-label="Close legend"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Status Bands */}
          <div className="space-y-1.5 mb-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider block">
              Progress Bands
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-status-not-started">
                <Circle className="size-3 shrink-0" />
                <span>Not Started (0%)</span>
              </div>
              <div className="flex items-center gap-1.5 text-status-low">
                <AlertCircle className="size-3 shrink-0" />
                <span>Low (1–39%)</span>
              </div>
              <div className="flex items-center gap-1.5 text-status-in-progress">
                <Clock className="size-3 shrink-0" />
                <span>In Progress (40–75%)</span>
              </div>
              <div className="flex items-center gap-1.5 text-status-mastered">
                <CheckCircle2 className="size-3 shrink-0" />
                <span>Mastered (&gt;75%)</span>
              </div>
            </div>
          </div>

          {/* Edges */}
          <div className="space-y-1.5 border-t border-border/60 pt-2 text-xs">
            <span className="text-xs text-muted-foreground uppercase tracking-wider block">
              Edge Relationships
            </span>
            <div className="flex items-center gap-2">
              <span className="w-6 h-0.5 bg-[var(--color-graph-edge)]" />
              <span className="text-muted-foreground">Hierarchy (Parent → Child)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-0.5 border-t-2 border-dashed border-signal" />
              <span className="text-muted-foreground">Prerequisite (Required First)</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
