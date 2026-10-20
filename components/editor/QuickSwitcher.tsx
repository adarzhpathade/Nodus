"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  FileText,
  CheckCircle2,
  Layers,
  BookOpen,
  Loader2,
  CornerDownLeft,
} from "lucide-react";
import { quickSearch } from "@/lib/actions/notes";
import { useQuickSwitcher } from "@/stores/useQuickSwitcher";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchItem {
  type: "note" | "topic" | "unit" | "subject";
  id: string;
  title: string;
  subtitle: string;
}

export function QuickSwitcher() {
  const router = useRouter();
  const { isOpen, close, toggle } = useQuickSwitcher();

  const [query, setQuery] = useState("");
  const [foundResults, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const results = query.trim() ? foundResults : [];

  // Global Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  // Search when query changes
  useEffect(() => {
    if (!isOpen) return;

    if (!query.trim()) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await quickSearch({ query: query.trim(), limit: 12 });
        if (res.ok) {
          setResults(res.data);
          setSelectedIndex(0);
        }
      } catch {
        // Ignore search error
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Navigate to item
  const handleSelect = (item: SearchItem) => {
    close();
    setQuery("");

    switch (item.type) {
      case "note":
        router.push(`/notes/${item.id}`);
        break;
      case "topic":
        router.push(`/notes?topic=${item.id}`);
        break;
      case "unit":
        router.push(`/notes?unit=${item.id}`);
        break;
      case "subject":
        router.push(`/subjects`);
        break;
    }
  };

  // Keyboard navigation within list
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, results]);

  const renderIcon = (type: SearchItem["type"]) => {
    switch (type) {
      case "note":
        return <FileText className="size-4 text-primary" />;
      case "topic":
        return <CheckCircle2 className="size-4 text-status-mastered" />;
      case "unit":
        return <Layers className="size-4 text-accent-foreground" />;
      case "subject":
        return <BookOpen className="size-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Quick Switcher</DialogTitle>
          <DialogDescription>Search across notes, topics, units, and subjects</DialogDescription>
        </DialogHeader>

        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-border/60 bg-card px-3">
          <Search className="size-4 text-muted-foreground mr-2 shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, topics, units... (Esc to close)"
            className="h-12 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
            autoFocus
          />
          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0" />}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-1">
          {!query.trim() ? (
            <div className="text-label py-10 text-center text-muted-foreground">
              Type to quickly jump to any note, topic, unit, or subject in your syllabus.
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="text-label py-10 text-center text-muted-foreground">
              No results found for &quot;{query}&quot;.
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-none border-b border-border/30 px-3 py-2.5 text-left text-xs transition-colors cursor-pointer",
                    isSelected
                      ? "bg-muted text-foreground font-medium border-l-2 border-l-signal pl-2.5"
                      : "hover:bg-muted/60 text-foreground"
                  )}
                >
                  <div className="size-7 rounded-none border border-border bg-background flex items-center justify-center shrink-0">
                    {renderIcon(item.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground truncate">{item.title}</div>
                    <div className="text-label text-muted-foreground truncate font-mono text-[11px]">
                      {item.subtitle}
                    </div>
                  </div>
                  <span className="text-label border border-border bg-muted/50 px-1.5 py-0.5 text-muted-foreground shrink-0">
                    {item.type}
                  </span>
                  {isSelected && (
                    <CornerDownLeft className="size-3 text-signal shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="text-label flex items-center justify-between border-t border-border bg-muted/40 px-3 py-2 text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="border border-border bg-background px-1 py-0.5 text-[10px] font-mono">↑</kbd>{" "}
              <kbd className="border border-border bg-background px-1 py-0.5 text-[10px] font-mono">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="border border-border bg-background px-1 py-0.5 text-[10px] font-mono">Enter</kbd> to open
            </span>
          </div>
          <kbd className="border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono">Esc</kbd>
        </div>
      </DialogContent>
    </Dialog>
  );
}
