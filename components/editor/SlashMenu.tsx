"use client";

import { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { motion, AnimatePresence } from "motion/react";
import {
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
  Type,
} from "lucide-react";
import { spring } from "@/components/motion/tokens";
import { cn } from "@/lib/utils";

export interface SlashMenuItem {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
  command: (editor: Editor) => void;
}

interface SlashMenuProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  query: string;
  position: { top: number; left: number } | null;
  onOpenLinkPicker: () => void;
  onOpenImageDialog: () => void;
}

export function SlashMenu({
  editor,
  isOpen,
  onClose,
  query,
  position,
  onOpenLinkPicker,
  onOpenImageDialog,
}: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const items: SlashMenuItem[] = [
    {
      title: "Text",
      description: "Just plain paragraph text",
      icon: Type,
      keywords: ["text", "paragraph", "p"],
      command: (ed) => ed.chain().focus().setParagraph().run(),
    },
    {
      title: "Heading 1",
      description: "Large section title",
      icon: Heading1,
      keywords: ["h1", "heading", "title", "large"],
      command: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      title: "Heading 2",
      description: "Medium subsection heading",
      icon: Heading2,
      keywords: ["h2", "heading", "subtitle", "medium"],
      command: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      title: "Heading 3",
      description: "Small section heading",
      icon: Heading3,
      keywords: ["h3", "heading", "small"],
      command: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      title: "Bullet List",
      description: "Simple bulleted list",
      icon: List,
      keywords: ["bullet", "list", "ul", "point"],
      command: (ed) => ed.chain().focus().toggleBulletList().run(),
    },
    {
      title: "Numbered List",
      description: "Ordered numbered sequence",
      icon: ListOrdered,
      keywords: ["numbered", "ordered", "ol", "sequence", "numbers"],
      command: (ed) => ed.chain().focus().toggleOrderedList().run(),
    },
    {
      title: "Checklist",
      description: "Task items with checkboxes",
      icon: CheckSquare,
      keywords: ["todo", "task", "check", "checklist", "box"],
      command: (ed) => ed.chain().focus().toggleList("taskList", "taskItem").run(),
    },
    {
      title: "Code Block",
      description: "Syntax highlighted code snippet",
      icon: Code2,
      keywords: ["code", "snippet", "pre", "javascript", "python"],
      command: (ed) => ed.chain().focus().toggleCodeBlock().run(),
    },
    {
      title: "Quote",
      description: "Blockquote for formulas or definitions",
      icon: Quote,
      keywords: ["quote", "blockquote", "callout", "definition"],
      command: (ed) => ed.chain().focus().toggleBlockquote().run(),
    },
    {
      title: "Table",
      description: "Insert a formatted grid table",
      icon: TableIcon,
      keywords: ["table", "grid", "rows", "columns"],
      command: (ed) =>
        ed
          .chain()
          .focus()
          .insertContent(
            `<table><tbody><tr><th>Header 1</th><th>Header 2</th></tr><tr><td>Cell 1</td><td>Cell 2</td></tr></tbody></table>`
          )
          .run(),
    },
    {
      title: "Link to Syllabus / Note",
      description: "Reference another note, topic, or unit",
      icon: LinkIcon,
      keywords: ["link", "nodus", "topic", "unit", "note", "syllabus"],
      command: () => onOpenLinkPicker(),
    },
    {
      title: "Image by URL",
      description: "Embed an external diagram or photo",
      icon: ImageIcon,
      keywords: ["image", "picture", "photo", "diagram", "url"],
      command: () => onOpenImageDialog(),
    },
    {
      title: "Divider",
      description: "Horizontal separator line",
      icon: Minus,
      keywords: ["divider", "separator", "hr", "line"],
      command: (ed) => ed.chain().focus().setHorizontalRule().run(),
    },
  ];

  // Filter items by query
  const cleanQuery = query.toLowerCase().trim();
  const filteredItems = items.filter(
    (item) =>
      !cleanQuery ||
      item.title.toLowerCase().includes(cleanQuery) ||
      item.description.toLowerCase().includes(cleanQuery) ||
      item.keywords.some((kw) => kw.includes(cleanQuery))
  );

  // Reset selectedIndex when the query changes (state adjusted during render, not in an effect)
  const [prevQuery, setPrevQuery] = useState(cleanQuery);
  if (prevQuery !== cleanQuery) {
    setPrevQuery(cleanQuery);
    setSelectedIndex(0);
  }

  // Execute selected command
  const executeItem = (item: SlashMenuItem) => {
    if (!editor) return;

    // Remove the slash and query text
    const { state } = editor;
    const { from } = state.selection;
    const textBefore = state.doc.textBetween(Math.max(0, from - 20), from, "\n");
    const slashIndex = textBefore.lastIndexOf("/");

    if (slashIndex !== -1) {
      const deleteStart = from - (textBefore.length - slashIndex);
      editor.commands.deleteRange({ from: deleteStart, to: from });
    }

    item.command(editor);
    onClose();
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length)
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          executeItem(filteredItems[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredItems]);

  if (!isOpen || !position || filteredItems.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.94, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={spring.pop}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
        className="fixed z-50 max-h-80 w-72 overflow-y-auto rounded-xl border border-border bg-popover/95 p-1.5 text-popover-foreground shadow-pop backdrop-blur-md outline-none"
      >
        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
          Insert Block
        </div>

        <div className="space-y-0.5">
          {filteredItems.map((item, index) => {
            const isSelected = index === selectedIndex;
            const Icon = item.icon;

            return (
              <button
                key={item.title}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => executeItem(item)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                  isSelected
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-foreground hover:bg-muted/60"
                )}
              >
                <div
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md border",
                    isSelected
                      ? "border-primary/20 bg-background text-primary"
                      : "border-border/60 bg-muted/40 text-muted-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{item.title}</div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
