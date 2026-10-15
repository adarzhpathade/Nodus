"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, FileText } from "lucide-react";
import { createNote } from "@/lib/actions/notes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface SubjectWithUnitsAndTopics {
  id: string;
  name: string;
  code: string;
  units: Array<{
    id: string;
    title: string;
    order: number;
    topics: Array<{
      id: string;
      title: string;
      order: number;
    }>;
  }>;
}

interface CreateNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: SubjectWithUnitsAndTopics[];
  defaultSubjectId?: string;
  defaultUnitId?: string;
  defaultTopicId?: string;
}

export function CreateNoteDialog({
  open,
  onOpenChange,
  subjects,
  defaultSubjectId,
  defaultUnitId,
  defaultTopicId,
}: CreateNoteDialogProps) {
  const router = useRouter();
  const titleId = useId();
  const subjectIdField = useId();
  const unitIdField = useId();
  const topicIdField = useId();

  // Find initial subject/unit/topic defaults
  const initialSubject =
    subjects.find((s) => s.id === defaultSubjectId) || subjects[0];
  const initialUnit =
    initialSubject?.units.find((u) => u.id === defaultUnitId) ||
    initialSubject?.units[0];
  const initialTopic =
    initialUnit?.topics.find((t) => t.id === defaultTopicId) ||
    initialUnit?.topics[0];

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubject?.id || ""
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string>(
    initialUnit?.id || ""
  );
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    initialTopic?.id || ""
  );
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived current subject & unit options
  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);
  const units = currentSubject?.units || [];
  const currentUnit = units.find((u) => u.id === selectedUnitId);
  const topics = currentUnit?.topics || [];

  const handleSubjectChange = (newSubjectId: string) => {
    setSelectedSubjectId(newSubjectId);
    const sub = subjects.find((s) => s.id === newSubjectId);
    const firstUnit = sub?.units[0];
    setSelectedUnitId(firstUnit?.id || "");
    setSelectedTopicId(firstUnit?.topics[0]?.id || "");
  };

  const handleUnitChange = (newUnitId: string) => {
    setSelectedUnitId(newUnitId);
    const unit = units.find((u) => u.id === newUnitId);
    setSelectedTopicId(unit?.topics[0]?.id || "");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopicId || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await createNote({
        topicId: selectedTopicId,
        title: title.trim() || undefined,
      });

      if (!res.ok) {
        setError(res.error.message || "Could not create note. Please check topic.");
        setSubmitting(false);
        return;
      }

      onOpenChange(false);
      setTitle("");
      router.push(`/notes/${res.data.id}`);
    } catch {
      setError("An unexpected error occurred while creating the note.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <FileText className="size-4" />
              </div>
              <div>
                <DialogTitle>Create New Note</DialogTitle>
                <DialogDescription>
                  Every note connects to a specific syllabus topic.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            {/* Note Title */}
            <div className="space-y-1.5">
              <label
                htmlFor={titleId}
                className="text-xs font-medium text-foreground"
              >
                Note Title (Optional)
              </label>
              <Input
                id={titleId}
                placeholder="e.g. Graph Traversal Algorithms"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
                autoFocus
              />
            </div>

            {/* Subject Select */}
            <div className="space-y-1.5">
              <label
                htmlFor={subjectIdField}
                className="text-xs font-medium text-foreground"
              >
                Subject
              </label>
              <select
                id={subjectIdField}
                value={selectedSubjectId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-xs text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id} className="bg-popover text-foreground">
                    {sub.code} — {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit Select */}
            <div className="space-y-1.5">
              <label
                htmlFor={unitIdField}
                className="text-xs font-medium text-foreground"
              >
                Unit
              </label>
              <select
                id={unitIdField}
                value={selectedUnitId}
                onChange={(e) => handleUnitChange(e.target.value)}
                disabled={units.length === 0}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-xs text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              >
                {units.length === 0 ? (
                  <option value="">No units available</option>
                ) : (
                  units.map((unit) => (
                    <option key={unit.id} value={unit.id} className="bg-popover text-foreground">
                      Unit {unit.order} — {unit.title}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Topic Select */}
            <div className="space-y-1.5">
              <label
                htmlFor={topicIdField}
                className="text-xs font-medium text-foreground"
              >
                Topic <span className="text-destructive">*</span>
              </label>
              <select
                id={topicIdField}
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                disabled={topics.length === 0}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-xs text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                required
              >
                {topics.length === 0 ? (
                  <option value="">No topics available</option>
                ) : (
                  topics.map((t) => (
                    <option key={t.id} value={t.id} className="bg-popover text-foreground">
                      {t.order}. {t.title}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!selectedTopicId || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="size-3.5" />
                  <span>Create & Open Note</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
