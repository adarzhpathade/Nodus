"use client";

import { useState, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import {
  Search,
  FileText,
  CheckCircle2,
  Layers,
  BookOpen,
  Plus,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { noteLinkHref, type LinkTarget } from "@/contracts/notes";
import { quickSearch, createNote } from "@/lib/actions/notes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LinkPickerDialogProps {
  editor: Editor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTopicId: string;
}

interface SearchItem {
  type: "note" | "topic" | "unit" | "subject";
  id: string;
  title: string;
  subtitle: string;
}

export function LinkPickerDialog({
  editor,
  open,
  onOpenChange,
  currentTopicId,
}: LinkPickerDialogProps) {
  const [query, setQuery] = useState("");
  const [foundResults, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const results = query.trim() ? foundResults : [];

  // Search when query changes
  useEffect(() => {
    if (!open) return;

    if (!query.trim()) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await quickSearch({ query: query.trim(), limit: 10 });
        if (res.ok) {
          setResults(res.data);
          setSelectedIndex(0);
        }
      } catch {
        // Ignore search error
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, open]);

  const insertLink = (target: LinkTarget, title: string) => {
    if (!editor) return;

    const href = noteLinkHref(target);
    const { from, to } = editor.state.selection;

    if (from === to) {
      // No text selected, insert linked title
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${href}">${title}</a> `)
        .run();
    } else {
      // Text is selected, wrap it with link
      editor
        .chain()
        .focus()
        .setLink({ href })
        .run();
    }

    onOpenChange(false);
    setQuery("");
  };

  const handleCreateNewInline = async () => {
    if (!query.trim() || creating) return;

    setCreating(true);
    try {
      const res = await createNote({
        topicId: currentTopicId,
        title: query.trim(),
      });

      if (res.ok) {
        insertLink({ type: "note", id: res.data.id }, res.data.title);
      }
    } catch {
      // Ignore create error
    } finally {
      setCreating(false);
    }
  };

  const renderIcon = (type: SearchItem["type"]) => {
    switch (type) {
      case "note":
        return <FileText className="size-3.5 text-primary" />;
      case "topic":
        return <CheckCircle2 className="size-3.5 text-status-mastered" />;
      case "unit":
        return <Layers className="size-3.5 text-accent-foreground" />;
      case "subject":
        return <BookOpen className="size-3.5 text-muted-foreground" />;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const validResults = results.filter((r) => r.type !== "subject");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, validResults.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + validResults.length) % Math.max(1, validResults.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (validResults[selectedIndex]) {
        const item = validResults[selectedIndex];
        insertLink({ type: item.type as "note" | "topic" | "unit", id: item.id }, item.title);
      } else if (query.trim()) {
        handleCreateNewInline();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        <DialogHeader className="p-4 pb-2 border-b border-border/60">
          <DialogTitle className="text-sm font-semibold">Link to Syllabus or Note</DialogTitle>
          <DialogDescription className="text-xs">
            Connect notes to other notes, topics, or units using persistent IDs.
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="relative p-3 border-b border-border/40 bg-muted/20">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search notes, topics, units..."
            className="pl-9 h-9 text-xs"
            autoFocus
          />
        </div>

        {/* Results List */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {loading && (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span>Searching syllabus...</span>
            </div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No matching notes or topics found.
            </div>
          )}

          {!loading &&
            results.map((item, idx) => {
              if (item.type === "subject") return null; // LinkTarget is only note | topic | unit

              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() =>
                    insertLink(
                      { type: item.type as "note" | "topic" | "unit", id: item.id },
                      item.title
                    )
                  }
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition-colors",
                    isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                  )}
                >
                  <div className="size-6 rounded-md bg-muted flex items-center justify-center shrink-0">
                    {renderIcon(item.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground truncate">{item.title}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {item.subtitle}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                    {item.type}
                  </span>
                </button>
              );
            })}

          {/* Option to create new note inline */}
          {query.trim() && (
            <div className="pt-2 border-t border-border/40 mt-1">
              <button
                type="button"
                onClick={handleCreateNewInline}
                disabled={creating}
                className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-primary hover:bg-primary/10 transition-colors"
              >
                {creating ? (
                  <Loader2 className="size-4 animate-spin shrink-0" />
                ) : (
                  <Plus className="size-4 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    Create new note &quot;{query.trim()}&quot;
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Creates a note and inserts a link to it
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
