"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";
import { LinkMark } from "./extensions/LinkMark";
import { EditorToolbar } from "./EditorToolbar";
import { SlashMenu } from "./SlashMenu";
import { LinkPickerDialog } from "./LinkPickerDialog";
import { LinkHoverPreview } from "./LinkHoverPreview";
import { parseNoteLinkHref } from "@/contracts/notes";
import { cn } from "@/lib/utils";

interface TiptapEditorProps {
  initialContentMd: string;
  topicId: string;
  onChange: (markdown: string) => void;
  className?: string;
}

export function TiptapEditor({
  initialContentMd,
  topicId,
  onChange,
  className,
}: TiptapEditorProps) {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);

  // Slash menu state
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashPosition, setSlashPosition] = useState<{ top: number; left: number } | null>(null);

  // Dialog states
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  // Editor instance
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: {
          HTMLAttributes: {
            class: "rounded-lg bg-muted/60 p-3.5 font-mono text-xs overflow-x-auto border border-border/60",
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: "border-l-2 border-primary/70 pl-4 py-0.5 italic text-muted-foreground",
          },
        },
      }),
      Placeholder.configure({
        placeholder: "Write note, or press '/' for commands...",
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: "space-y-1 my-2 list-none p-0",
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: "flex items-start gap-2.5 my-1",
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: "border border-border max-w-full my-3",
        },
      }),
      // TableKit registers table, row, cell and header nodes together; Table alone cannot render a grid.
      TableKit.configure({
        table: {
          resizable: true,
          HTMLAttributes: {
            class: "border-collapse w-full my-3 text-xs border border-border overflow-hidden",
          },
        },
      }),
      LinkMark,
      Markdown,
    ],
    // Notes are stored as Markdown (AGENTS.md 6.4): parse the saved string as Markdown, not plain text.
    content: initialContentMd,
    contentType: "markdown",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[420px] p-6 focus:outline-none text-foreground leading-relaxed",
      },
    },
    onUpdate({ editor }) {
      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(Math.max(0, from - 20), from, "\n");
      const match = /(?:^|\s)\/([a-zA-Z0-9_-]*)$/.exec(textBefore);

      if (match) {
        try {
          const coords = editor.view.coordsAtPos(from);
          setSlashPosition({ top: coords.bottom + 6, left: Math.max(16, coords.left) });
          setSlashQuery(match[1]);
          setSlashMenuOpen(true);
        } catch {
          setSlashMenuOpen(false);
        }
      } else {
        setSlashMenuOpen(false);
      }

      onChange(editor.getMarkdown());
    },
    onSelectionUpdate() {
      // Close slash menu if selection moves outside
      if (!editor?.state) return;
      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(Math.max(0, from - 20), from, "\n");
      if (!/(?:^|\s)\/[a-zA-Z0-9_-]*$/.test(textBefore)) {
        setSlashMenuOpen(false);
      }
    },
  });

  // Intercept clicking on nodus:// links to route inside the app
  const handleEditorClick = useCallback(
    (e: React.MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a");
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href) return;

      const parsed = parseNoteLinkHref(href);
      if (parsed) {
        e.preventDefault();
        if (parsed.type === "note") {
          router.push(`/notes/${parsed.id}`);
        } else if (parsed.type === "topic") {
          router.push(`/notes?topic=${parsed.id}`);
        } else if (parsed.type === "unit") {
          router.push(`/notes?unit=${parsed.id}`);
        }
      }
    },
    [router]
  );

  return (
    <div
      ref={editorRef}
      onClick={handleEditorClick}
      className={cn(
        "relative flex flex-col rounded-xl border border-border bg-card shadow-card transition-all overflow-hidden",
        className
      )}
    >
      {/* Editor Formatting Toolbar */}
      <EditorToolbar
        editor={editor}
        onOpenLinkPicker={() => setLinkPickerOpen(true)}
        imageDialogOpen={imageDialogOpen}
        onImageDialogOpenChange={setImageDialogOpen}
      />

      {/* Editor Content Area */}
      <div className="relative min-h-[460px] bg-background/50">
        <EditorContent editor={editor} />
      </div>

      {/* Slash Menu */}
      <SlashMenu
        editor={editor}
        isOpen={slashMenuOpen}
        onClose={() => setSlashMenuOpen(false)}
        query={slashQuery}
        position={slashPosition}
        onOpenLinkPicker={() => {
          setSlashMenuOpen(false);
          setLinkPickerOpen(true);
        }}
        onOpenImageDialog={() => {
          setSlashMenuOpen(false);
          setImageDialogOpen(true);
        }}
      />

      {/* Link Picker Dialog */}
      <LinkPickerDialog
        editor={editor}
        open={linkPickerOpen}
        onOpenChange={setLinkPickerOpen}
        currentTopicId={topicId}
      />

      {/* Hover preview on nodus:// links */}
      <LinkHoverPreview containerRef={editorRef} />
    </div>
  );
}

export function EditorSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-6 space-y-4 animate-pulse">
      <div className="h-8 w-1/3 rounded bg-muted" />
      <div className="h-9 w-full rounded bg-muted/60" />
      <div className="space-y-2 pt-4">
        <div className="h-4 w-full rounded bg-muted/50" />
        <div className="h-4 w-5/6 rounded bg-muted/50" />
        <div className="h-4 w-2/3 rounded bg-muted/50" />
        <div className="h-4 w-3/4 rounded bg-muted/50" />
      </div>
      <div className="h-40 rounded bg-muted/30 pt-4" />
    </div>
  );
}
