"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code2,
  Quote,
  Table as TableIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
  Undo,
  Redo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  editor: Editor | null;
  onOpenLinkPicker: () => void;
  imageDialogOpen?: boolean;
  onImageDialogOpenChange?: (open: boolean) => void;
  className?: string;
}

export function EditorToolbar({
  editor,
  onOpenLinkPicker,
  imageDialogOpen,
  onImageDialogOpenChange,
  className,
}: EditorToolbarProps) {
  const [internalImageOpen, setInternalImageOpen] = useState(false);
  const isImageOpen = imageDialogOpen !== undefined ? imageDialogOpen : internalImageOpen;
  const setImageOpen = onImageDialogOpenChange || setInternalImageOpen;

  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");

  if (!editor) return null;

  const handleInsertImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) return;

    editor
      .chain()
      .focus()
      .setImage({
        src: imageUrl.trim(),
        alt: imageAlt.trim() || undefined,
      })
      .run();

    setImageUrl("");
    setImageAlt("");
    setImageOpen(false);
  };

  const handleInsertTable = () => {
    // In Tiptap Table extension, insertTable command creates a 3x3 table by default
    editor.chain().focus().insertContent(`<table><tbody><tr><th>Header 1</th><th>Header 2</th></tr><tr><td>Cell 1</td><td>Cell 2</td></tr></tbody></table>`).run();
  };

  return (
    <>
      <div
        className={cn(
          "sticky top-0 z-20 flex flex-wrap items-center gap-1 border-b border-border bg-card/90 px-3 py-2 backdrop-blur-sm",
          className
        )}
      >
        {/* Headings */}
        <div className="flex items-center gap-0.5 border-r border-border/60 pr-1.5 mr-1">
          <Button
            type="button"
            variant={editor.isActive("heading", { level: 1 }) ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
            aria-label="Heading 1"
          >
            <Heading1 className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
            aria-label="Heading 2"
          >
            <Heading2 className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("heading", { level: 3 }) ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
            aria-label="Heading 3"
          >
            <Heading3 className="size-3.5" />
          </Button>
        </div>

        {/* Text styling */}
        <div className="flex items-center gap-0.5 border-r border-border/60 pr-1.5 mr-1">
          <Button
            type="button"
            variant={editor.isActive("bold") ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (Ctrl+B)"
            aria-label="Bold"
          >
            <Bold className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("italic") ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
            aria-label="Italic"
          >
            <Italic className="size-3.5" />
          </Button>
        </div>

        {/* Lists & Tasks */}
        <div className="flex items-center gap-0.5 border-r border-border/60 pr-1.5 mr-1">
          <Button
            type="button"
            variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
            aria-label="Bullet list"
          >
            <List className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered list"
            aria-label="Numbered list"
          >
            <ListOrdered className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("taskList") ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => editor.chain().focus().toggleList("taskList", "taskItem").run()}
            title="Checklist"
            aria-label="Checklist"
          >
            <CheckSquare className="size-3.5" />
          </Button>
        </div>

        {/* Code & Quote */}
        <div className="flex items-center gap-0.5 border-r border-border/60 pr-1.5 mr-1">
          <Button
            type="button"
            variant={editor.isActive("codeBlock") ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code block"
            aria-label="Code block"
          >
            <Code2 className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Quote"
            aria-label="Quote"
          >
            <Quote className="size-3.5" />
          </Button>
        </div>

        {/* Insert Elements: Link, Table, Image, Divider */}
        <div className="flex items-center gap-0.5 border-r border-border/60 pr-1.5 mr-1">
          <Button
            type="button"
            variant={editor.isActive("link") ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={onOpenLinkPicker}
            title="Link note, topic, or unit"
            aria-label="Link note, topic, or unit"
          >
            <LinkIcon className="size-3.5 text-primary" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleInsertTable}
            title="Insert table"
            aria-label="Insert table"
          >
            <TableIcon className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setImageOpen(true)}
            title="Insert image by URL"
            aria-label="Insert image by URL"
          >
            <ImageIcon className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal divider"
            aria-label="Horizontal divider"
          >
            <Minus className="size-3.5" />
          </Button>
        </div>

        {/* History: Undo / Redo */}
        <div className="flex items-center gap-0.5 ml-auto">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Image by URL Dialog */}
      <Dialog open={isImageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleInsertImage}>
            <DialogHeader>
              <DialogTitle>Insert Image by URL</DialogTitle>
              <DialogDescription>
                Provide a public image web address (https://).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Image URL <span className="text-destructive">*</span>
                </label>
                <Input
                  type="url"
                  placeholder="https://example.com/diagram.png"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Caption / Alt Text
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Breadth-First Search traversal tree"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setImageOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!imageUrl.trim()}>
                Insert Image
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
