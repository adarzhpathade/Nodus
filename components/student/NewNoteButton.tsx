"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { createNote } from "@/lib/actions/notes";
import { Button, type buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

interface NewNoteButtonProps extends VariantProps<typeof buttonVariants> {
  topicId: string;
  title?: string;
  className?: string;
  children?: React.ReactNode;
  onCreated?: (noteId: string) => void;
}

export function NewNoteButton({
  topicId,
  title,
  variant = "secondary",
  size = "sm",
  className,
  children,
  onCreated,
}: NewNoteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const result = await createNote({
        topicId,
        title: title?.trim() || undefined,
      });

      if (!result.ok) {
        setError(result.error.message || "Failed to create note.");
        setLoading(false);
        return;
      }

      if (onCreated) {
        onCreated(result.data.id);
      }

      router.push(`/notes/${result.data.id}`);
    } catch {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={loading}
      onClick={handleCreate}
      title={error || undefined}
      aria-label={children ? (title ? `Add note for ${title}` : "Add note") : undefined}
    >
      {loading ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          <span>Creating...</span>
        </>
      ) : (
        children || (
          <>
            <Plus className="size-3.5" />
            <span>Add Note</span>
          </>
        )
      )}
    </Button>
  );
}
