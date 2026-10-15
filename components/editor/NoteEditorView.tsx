"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Download,
  FileText,
  Loader2,
  Trash2,
  Tag as TagIcon,
  Plus,
  X,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import type { Note, Tag } from "@/contracts/notes";
import { motion, AnimatePresence } from "motion/react";
import { updateNote, deleteNote, exportNoteMarkdown } from "@/lib/actions/notes";
import { EditorSkeleton } from "./TiptapEditor";
import { BacklinksPanel } from "./BacklinksPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Lazy-load the Tiptap editor
const DynamicTiptapEditor = dynamic(
  () => import("./TiptapEditor").then((mod) => mod.TiptapEditor),
  {
    ssr: false,
    loading: () => <EditorSkeleton />,
  }
);

interface NoteEditorViewProps {
  note: Note;
}

export function NoteEditorView({ note }: NoteEditorViewProps) {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState(note.title);
  const [contentMd, setContentMd] = useState(note.contentMd);
  const [tags, setTags] = useState<string[]>(note.tags);
  const [newTagInput, setNewTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Last saved snapshot to send only changed fields
  const lastSavedRef = useRef({
    title: note.title,
    contentMd: note.contentMd,
    tags: [...note.tags],
  });

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Perform the auto-save mutation
  const performSave = useCallback(async (currentTitle: string, currentContent: string, currentTags: string[]) => {
    const lastSaved = lastSavedRef.current;

    // Check what actually changed
    const effectiveTitle = currentTitle.trim() || "Untitled note";
    const titleChanged = effectiveTitle !== lastSaved.title;
    const contentChanged = currentContent !== lastSaved.contentMd;
    const tagsChanged =
      currentTags.length !== lastSaved.tags.length ||
      currentTags.some((t, i) => t !== lastSaved.tags[i]);

    if (!titleChanged && !contentChanged && !tagsChanged) {
      return;
    }

    setSaveStatus("saving");
    setErrorMessage(null);

    try {
      const res = await updateNote({
        noteId: note.id,
        title: titleChanged ? effectiveTitle : undefined,
        contentMd: contentChanged ? currentContent : undefined,
        tags: tagsChanged ? (currentTags as Tag[]) : undefined,
      });

      if (!res.ok) {
        setSaveStatus("error");
        setErrorMessage(res.error.message || "Auto-save failed");
        return;
      }

      // Update snapshot
      lastSavedRef.current = {
        title: effectiveTitle,
        contentMd: currentContent,
        tags: [...currentTags],
      };

      setSaveStatus("saved");

      // Fade saved indicator after 2.5s
      setTimeout(() => {
        setSaveStatus((prev) => (prev === "saved" ? "idle" : prev));
      }, 2500);
    } catch {
      setSaveStatus("error");
      setErrorMessage("Could not connect to server");
    }
  }, [note.id]);

  // Debounce trigger whenever title, contentMd, or tags change
  useEffect(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Debounce ~1s (1000ms)
    saveTimerRef.current = setTimeout(() => {
      performSave(title, contentMd, tags);
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [title, contentMd, tags, performSave]);

  // Handle content change from Tiptap editor
  const handleEditorChange = useCallback((newMarkdown: string) => {
    setContentMd(newMarkdown);
  }, []);

  // Tag management
  const handleAddTag = () => {
    const cleanTag = newTagInput
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");

    if (cleanTag && !tags.includes(cleanTag) && tags.length < 20) {
      setTags((prev) => [...prev, cleanTag]);
      setNewTagInput("");
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  // Delete note action
  const handleDeleteNote = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteNote({ noteId: note.id });
      if (res.ok) {
        router.push("/notes");
      }
    } catch {
      setIsDeleting(false);
    }
  };

  // Export Markdown action
  const handleExportMarkdown = async () => {
    setIsExporting(true);
    try {
      const res = await exportNoteMarkdown({ noteId: note.id });
      let fileName = `${note.title.replace(/[^a-zA-Z0-9_-]/g, "_") || "note"}.md`;
      let content = contentMd;

      if (res.ok) {
        fileName = res.data.fileName;
        content = res.data.content;
      }

      // Download file in browser
      const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: direct blob download
      const blob = new Blob([contentMd], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${note.title || "note"}.md`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const locationBreadcrumb = [
    note.location.subjectName,
    note.location.unitTitle,
    note.location.topicTitle,
  ]
    .filter(Boolean)
    .join(" › ");

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            render={<Link href="/notes" />}
          >
            <ArrowLeft className="size-3.5" />
            <span>All Notes</span>
          </Button>

          <span className="text-muted-foreground/40">/</span>

          <span
            className="text-xs font-mono text-muted-foreground max-w-xs truncate"
            title={locationBreadcrumb}
          >
            {locationBreadcrumb}
          </span>
        </div>

        {/* Action Controls & Save Status */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Subtle Auto-save Indicator */}
          <div className="h-6 flex items-center">
            <AnimatePresence mode="wait">
              {saveStatus === "saving" && (
                <motion.span
                  key="saving"
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <Loader2 className="size-3 animate-spin" />
                  <span>Saving...</span>
                </motion.span>
              )}
              {saveStatus === "saved" && (
                <motion.span
                  key="saved"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <Check className="size-3 text-status-mastered" />
                  <span>Saved</span>
                </motion.span>
              )}
              {saveStatus === "error" && (
                <motion.span
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-1 text-xs text-destructive"
                >
                  <AlertCircle className="size-3" />
                  <span>{errorMessage || "Save error"}</span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Export Markdown Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportMarkdown}
            disabled={isExporting}
            className="h-8 gap-1.5 text-xs font-medium"
            title="Download note as a Markdown (.md) file"
          >
            {isExporting ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Download className="size-3" />
            )}
            <span>Export .md</span>
          </Button>

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="size-8 text-muted-foreground hover:text-destructive"
            title="Delete this note"
            aria-label="Delete note"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Grid: Editor on Left, Backlinks & Metadata on Right */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Editor (3 Cols) */}
        <div className="space-y-4 lg:col-span-3">
          {/* Document Title Input */}
          <div className="pt-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled note"
              maxLength={160}
              className="w-full bg-transparent font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/50 border-none outline-none focus:ring-0 px-1 py-1"
            />
          </div>

          {/* Tags bar */}
          <div className="flex flex-wrap items-center gap-1.5 px-1 pb-1">
            <TagIcon className="size-3 text-muted-foreground/60 mr-1" />
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground"
              >
                <span>#{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="size-3 text-muted-foreground/60 hover:text-foreground"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}

            {isAddingTag ? (
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  placeholder="tag-name"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    } else if (e.key === "Escape") {
                      setIsAddingTag(false);
                    }
                  }}
                  className="h-6 w-28 text-xs font-mono px-2"
                  autoFocus
                />
                <Button variant="ghost" size="icon-xs" onClick={handleAddTag}>
                  <Check className="size-3" />
                </Button>
                <Button variant="ghost" size="icon-xs" onClick={() => setIsAddingTag(false)}>
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingTag(true)}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors cursor-pointer"
              >
                <Plus className="size-2.5" />
                <span>Add tag</span>
              </button>
            )}
          </div>

          {/* Tiptap Rich-Text Markdown Editor */}
          <DynamicTiptapEditor
            initialContentMd={note.contentMd}
            topicId={note.location.topicId || ""}
            onChange={handleEditorChange}
          />
        </div>

        {/* Sidebar Info & Backlinks (1 Col) */}
        <div className="space-y-6 lg:col-span-1">
          {/* Note Metadata Card */}
          <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3">
            <h4 className="font-heading text-xs font-semibold text-foreground uppercase tracking-wider">
              Topic Grounding
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-muted-foreground">Subject</span>
                <span className="font-medium text-foreground">{note.location.subjectName}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-muted-foreground">Unit</span>
                <span className="font-medium text-foreground">{note.location.unitTitle}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-muted-foreground">Topic</span>
                <span className="font-medium text-foreground">
                  {note.location.topicTitle || "General"}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50">
              <Link
                href={`/subjects/${note.location.subjectId}/units/${note.location.unitId}`}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
              >
                <span>View unit curriculum</span>
                <ExternalLink className="size-3" />
              </Link>
            </div>
          </div>

          {/* Backlinks Panel */}
          <BacklinksPanel backlinks={note.backlinks} />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Note?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{note.title}&quot; and remove all its links. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteNote}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Delete</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
