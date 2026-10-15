"use client";

import { useState } from "react";
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  FileText,
  UploadCloud,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Layers,
} from "lucide-react";
import type { SubjectDetail, UnitWithTopics, Topic } from "@/contracts/curriculum";
import type { Resource } from "@/contracts/resources";
import {
  createUnit,
  renameUnit,
  reorderUnits,
  deleteUnit,
  createTopic,
  renameTopic,
  reorderTopics,
  deleteTopic,
} from "@/lib/actions/curriculum";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResourceUploader } from "./ResourceUploader";
import { cn } from "@/lib/utils";

interface CurriculumManagerProps {
  subject: SubjectDetail;
  taughtSections: string[];
  initialResourcesByUnit: Record<string, Resource[]>;
}

export function CurriculumManager({
  subject,
  taughtSections,
  initialResourcesByUnit,
}: CurriculumManagerProps) {
  const [units, setUnits] = useState<UnitWithTopics[]>(subject.units);
  const [expandedUnitIds, setExpandedUnitIds] = useState<Set<string>>(
    new Set(subject.units.map((u) => u.id))
  );
  const [activeTabByUnit, setActiveTabByUnit] = useState<Record<string, "topics" | "resources">>({});

  // CRUD Dialog states
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [newUnitTitle, setNewUnitTitle] = useState("");

  const [renameUnitTarget, setRenameUnitTarget] = useState<UnitWithTopics | null>(null);
  const [renameUnitTitle, setRenameUnitTitle] = useState("");

  const [deleteUnitTarget, setDeleteUnitTarget] = useState<UnitWithTopics | null>(null);

  const [addTopicUnitId, setAddTopicUnitId] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState("");

  const [renameTopicTarget, setRenameTopicTarget] = useState<Topic | null>(null);
  const [renameTopicTitle, setRenameTopicTitle] = useState("");

  const [deleteTopicTarget, setDeleteTopicTarget] = useState<Topic | null>(null);

  // Loading and Error states
  const [isPending, setIsPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const toggleExpand = (unitId: string) => {
    const next = new Set(expandedUnitIds);
    if (next.has(unitId)) next.delete(unitId);
    else next.add(unitId);
    setExpandedUnitIds(next);
  };

  const setUnitTab = (unitId: string, tab: "topics" | "resources") => {
    setActiveTabByUnit((prev) => ({ ...prev, [unitId]: tab }));
  };

  // ----- Unit Actions -----

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitTitle.trim() || isPending) return;

    setIsPending(true);
    setActionError(null);

    const res = await createUnit({ subjectId: subject.id, title: newUnitTitle.trim() });
    if (res.ok) {
      setUnits([...units, { ...res.data, topics: [] }]);
      setNewUnitTitle("");
      setIsAddUnitOpen(false);
      setExpandedUnitIds((prev) => new Set([...prev, res.data.id]));
    } else {
      setActionError(res.error.message || "Failed to create unit.");
    }
    setIsPending(false);
  };

  const handleRenameUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameUnitTarget || !renameUnitTitle.trim() || isPending) return;

    setIsPending(true);
    setActionError(null);

    const res = await renameUnit({ unitId: renameUnitTarget.id, title: renameUnitTitle.trim() });
    if (res.ok) {
      setUnits(
        units.map((u) => (u.id === renameUnitTarget.id ? { ...u, title: res.data.title } : u))
      );
      setRenameUnitTarget(null);
    } else {
      setActionError(res.error.message || "Failed to rename unit.");
    }
    setIsPending(false);
  };

  const handleMoveUnit = async (unitIndex: number, direction: "up" | "down") => {
    if (isPending) return;
    const targetIndex = direction === "up" ? unitIndex - 1 : unitIndex + 1;
    if (targetIndex < 0 || targetIndex >= units.length) return;

    const reordered = [...units];
    const [moved] = reordered.splice(unitIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    // Optimistic
    setUnits(reordered.map((u, i) => ({ ...u, order: i + 1 })));

    setIsPending(true);
    setActionError(null);
    const res = await reorderUnits({
      parentId: subject.id,
      orderedIds: reordered.map((u) => u.id),
    });

    if (!res.ok) {
      // Revert
      setUnits(units);
      setActionError(res.error.message || "Failed to reorder units.");
    }
    setIsPending(false);
  };

  const handleDeleteUnit = async () => {
    if (!deleteUnitTarget || isPending) return;

    setIsPending(true);
    setActionError(null);

    const res = await deleteUnit({ unitId: deleteUnitTarget.id });
    if (res.ok) {
      setUnits(units.filter((u) => u.id !== deleteUnitTarget.id));
      setDeleteUnitTarget(null);
    } else {
      setActionError(res.error.message || "Failed to delete unit.");
    }
    setIsPending(false);
  };

  // ----- Topic Actions -----

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTopicUnitId || !newTopicTitle.trim() || isPending) return;

    setIsPending(true);
    setActionError(null);

    const res = await createTopic({ unitId: addTopicUnitId, title: newTopicTitle.trim() });
    if (res.ok) {
      setUnits(
        units.map((u) =>
          u.id === addTopicUnitId ? { ...u, topics: [...u.topics, res.data] } : u
        )
      );
      setNewTopicTitle("");
      setAddTopicUnitId(null);
    } else {
      setActionError(res.error.message || "Failed to create topic.");
    }
    setIsPending(false);
  };

  const handleRenameTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTopicTarget || !renameTopicTitle.trim() || isPending) return;

    setIsPending(true);
    setActionError(null);

    const res = await renameTopic({ topicId: renameTopicTarget.id, title: renameTopicTitle.trim() });
    if (res.ok) {
      setUnits(
        units.map((u) => ({
          ...u,
          topics: u.topics.map((t) => (t.id === renameTopicTarget.id ? res.data : t)),
        }))
      );
      setRenameTopicTarget(null);
    } else {
      setActionError(res.error.message || "Failed to rename topic.");
    }
    setIsPending(false);
  };

  const handleMoveTopic = async (
    unitId: string,
    topicIndex: number,
    direction: "up" | "down"
  ) => {
    if (isPending) return;
    const targetUnit = units.find((u) => u.id === unitId);
    if (!targetUnit) return;

    const targetIndex = direction === "up" ? topicIndex - 1 : topicIndex + 1;
    if (targetIndex < 0 || targetIndex >= targetUnit.topics.length) return;

    const reorderedTopics = [...targetUnit.topics];
    const [moved] = reorderedTopics.splice(topicIndex, 1);
    reorderedTopics.splice(targetIndex, 0, moved);

    // Optimistic
    setUnits(
      units.map((u) =>
        u.id === unitId
          ? { ...u, topics: reorderedTopics.map((t, i) => ({ ...t, order: i + 1 })) }
          : u
      )
    );

    setIsPending(true);
    setActionError(null);
    const res = await reorderTopics({
      parentId: unitId,
      orderedIds: reorderedTopics.map((t) => t.id),
    });

    if (!res.ok) {
      // Revert
      setUnits(units);
      setActionError(res.error.message || "Failed to reorder topics.");
    }
    setIsPending(false);
  };

  const handleDeleteTopic = async () => {
    if (!deleteTopicTarget || isPending) return;

    setIsPending(true);
    setActionError(null);

    const res = await deleteTopic({ topicId: deleteTopicTarget.id });
    if (res.ok) {
      setUnits(
        units.map((u) => ({
          ...u,
          topics: u.topics.filter((t) => t.id !== deleteTopicTarget.id),
        }))
      );
      setDeleteTopicTarget(null);
    } else {
      setActionError(res.error.message || "Failed to delete topic.");
    }
    setIsPending(false);
  };

  return (
    <div className="space-y-6">
      {/* Global Action Error / Conflict Banner */}
      {actionError && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="size-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Operation Blocked</p>
            <p className="text-xs text-destructive/90">{actionError}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActionError(null)}
            className="ml-auto -mr-2 h-7 px-2 text-xs text-destructive hover:bg-destructive/20"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Header and Add Unit */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
            {subject.code} — {subject.name}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define units and topics for this syllabus. Reorder or upload lecture slides.
          </p>
        </div>

        <Button
          onClick={() => {
            setActionError(null);
            setIsAddUnitOpen(true);
          }}
          size="sm"
          className="h-9 gap-1.5 text-xs font-medium"
        >
          <Plus className="size-4" />
          <span>Add Syllabus Unit</span>
        </Button>
      </div>

      {/* Units Tree */}
      {units.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-12 text-center">
          <FolderTree className="size-10 text-muted-foreground/50 mb-3" />
          <h3 className="font-heading text-base font-semibold text-foreground">
            No Units in this Subject
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Start structuring your syllabus by adding your first unit (e.g. &ldquo;Unit 1: Introduction&rdquo;).
          </p>
          <Button
            onClick={() => setIsAddUnitOpen(true)}
            size="sm"
            className="mt-4 gap-2 text-xs"
          >
            <Plus className="size-3.5" />
            <span>Create First Unit</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {units.map((unit, unitIndex) => {
            const isExpanded = expandedUnitIds.has(unit.id);
            const activeTab = activeTabByUnit[unit.id] ?? "topics";
            const unitResources = initialResourcesByUnit[unit.id] ?? [];

            return (
              <Card key={unit.id} className="border-border/80 transition-shadow">
                {/* Unit Header */}
                <CardHeader className="p-4 gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(unit.id)}
                        className="h-8 size-8 p-0 text-muted-foreground hover:text-foreground"
                        aria-label={isExpanded ? "Collapse unit" : "Expand unit"}
                      >
                        {isExpanded ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </Button>

                      <Badge variant="outline" className="font-mono text-xs font-semibold">
                        Unit {unit.order}
                      </Badge>

                      <CardTitle className="truncate text-base font-semibold text-foreground">
                        {unit.title}
                      </CardTitle>
                    </div>

                    {/* Unit Controls (Reorder, Rename, Delete) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveUnit(unitIndex, "up")}
                        disabled={unitIndex === 0 || isPending}
                        className="h-8 size-8 p-0 text-muted-foreground hover:text-foreground"
                        aria-label="Move unit up"
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveUnit(unitIndex, "down")}
                        disabled={unitIndex === units.length - 1 || isPending}
                        className="h-8 size-8 p-0 text-muted-foreground hover:text-foreground"
                        aria-label="Move unit down"
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActionError(null);
                          setRenameUnitTarget(unit);
                          setRenameUnitTitle(unit.title);
                        }}
                        className="h-8 size-8 p-0 text-muted-foreground hover:text-foreground"
                        aria-label="Rename unit"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActionError(null);
                          setDeleteUnitTarget(unit);
                        }}
                        className="h-8 size-8 p-0 text-muted-foreground hover:text-destructive"
                        aria-label="Delete unit"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Tabs toggle between Topics and Learning Materials */}
                  <div className="flex items-center gap-2 border-t border-border/60 pt-3">
                    <button
                      type="button"
                      onClick={() => setUnitTab(unit.id, "topics")}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        activeTab === "topics"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Layers className="size-3.5" />
                      <span>Topics ({unit.topics.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUnitTab(unit.id, "resources")}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        activeTab === "resources"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <UploadCloud className="size-3.5" />
                      <span>Learning Materials ({unitResources.length})</span>
                    </button>
                  </div>
                </CardHeader>

                {/* Unit Content */}
                {isExpanded && (
                  <CardContent className="p-4 pt-0">
                    {activeTab === "topics" ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            Topic Sequence ({unit.topics.length} defined)
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActionError(null);
                              setAddTopicUnitId(unit.id);
                            }}
                            className="h-7 gap-1 px-2 text-xs"
                          >
                            <Plus className="size-3" />
                            <span>Add Topic</span>
                          </Button>
                        </div>

                        {unit.topics.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-border/80 p-4 text-center text-xs text-muted-foreground">
                            No topics added yet. Click &ldquo;Add Topic&rdquo; to define syllabus points.
                          </p>
                        ) : (
                          <ul className="divide-y divide-border/60 rounded-lg border border-border/60 bg-muted/20">
                            {unit.topics.map((topic, topicIndex) => (
                              <li
                                key={topic.id}
                                className="flex items-center justify-between p-3 text-sm transition-colors hover:bg-muted/40"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                  <span className="size-5 shrink-0 flex items-center justify-center rounded-full bg-background border text-[11px] font-mono text-muted-foreground">
                                    {topic.order}
                                  </span>
                                  <span className="truncate font-medium text-foreground">
                                    {topic.title}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMoveTopic(unit.id, topicIndex, "up")}
                                    disabled={topicIndex === 0 || isPending}
                                    className="h-7 size-7 p-0 text-muted-foreground hover:text-foreground"
                                    aria-label="Move topic up"
                                  >
                                    <ArrowUp className="size-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMoveTopic(unit.id, topicIndex, "down")}
                                    disabled={topicIndex === unit.topics.length - 1 || isPending}
                                    className="h-7 size-7 p-0 text-muted-foreground hover:text-foreground"
                                    aria-label="Move topic down"
                                  >
                                    <ArrowDown className="size-3" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setActionError(null);
                                      setRenameTopicTarget(topic);
                                      setRenameTopicTitle(topic.title);
                                    }}
                                    className="h-7 size-7 p-0 text-muted-foreground hover:text-foreground"
                                    aria-label="Rename topic"
                                  >
                                    <Edit2 className="size-3" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setActionError(null);
                                      setDeleteTopicTarget(topic);
                                    }}
                                    className="h-7 size-7 p-0 text-muted-foreground hover:text-destructive"
                                    aria-label="Delete topic"
                                  >
                                    <Trash2 className="size-3" />
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <ResourceUploader
                        unitId={unit.id}
                        unitTitle={unit.title}
                        taughtSections={taughtSections}
                        initialResources={unitResources}
                      />
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Unit Dialog */}
      <Dialog open={isAddUnitOpen} onOpenChange={setIsAddUnitOpen}>
        <DialogContent>
          <form onSubmit={handleCreateUnit}>
            <DialogHeader>
              <DialogTitle>Add Syllabus Unit</DialogTitle>
              <DialogDescription>
                Create a new unit for {subject.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <label htmlFor="unit-title" className="text-xs font-medium text-muted-foreground">
                Unit Title
              </label>
              <Input
                id="unit-title"
                value={newUnitTitle}
                onChange={(e) => setNewUnitTitle(e.target.value)}
                placeholder="e.g. Unit 4: Dynamic Programming"
                autoFocus
                required
                maxLength={120}
              />
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={!newUnitTitle.trim() || isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : "Create Unit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Unit Dialog */}
      <Dialog open={!!renameUnitTarget} onOpenChange={(open) => !open && setRenameUnitTarget(null)}>
        <DialogContent>
          <form onSubmit={handleRenameUnit}>
            <DialogHeader>
              <DialogTitle>Rename Unit</DialogTitle>
              <DialogDescription>Update the title for this syllabus unit.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <label htmlFor="rename-unit-title" className="text-xs font-medium text-muted-foreground">
                Unit Title
              </label>
              <Input
                id="rename-unit-title"
                value={renameUnitTitle}
                onChange={(e) => setRenameUnitTitle(e.target.value)}
                autoFocus
                required
                maxLength={120}
              />
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={!renameUnitTitle.trim() || isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Unit Dialog */}
      <Dialog open={!!deleteUnitTarget} onOpenChange={(open) => !open && setDeleteUnitTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Unit</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteUnitTarget?.title}&rdquo;? If students have notes written under any topic in this unit, deletion will be blocked to preserve student notes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              onClick={handleDeleteUnit}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              <span>Delete Unit</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Topic Dialog */}
      <Dialog open={!!addTopicUnitId} onOpenChange={(open) => !open && setAddTopicUnitId(null)}>
        <DialogContent>
          <form onSubmit={handleCreateTopic}>
            <DialogHeader>
              <DialogTitle>Add Topic</DialogTitle>
              <DialogDescription>
                Define a new topic within this unit for student notes and AI grounding.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <label htmlFor="topic-title" className="text-xs font-medium text-muted-foreground">
                Topic Title
              </label>
              <Input
                id="topic-title"
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                placeholder="e.g. Dijkstra's Algorithm"
                autoFocus
                required
                maxLength={120}
              />
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={!newTopicTitle.trim() || isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : "Create Topic"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Topic Dialog */}
      <Dialog open={!!renameTopicTarget} onOpenChange={(open) => !open && setRenameTopicTarget(null)}>
        <DialogContent>
          <form onSubmit={handleRenameTopic}>
            <DialogHeader>
              <DialogTitle>Rename Topic</DialogTitle>
              <DialogDescription>Update the title for this topic.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <label htmlFor="rename-topic-title" className="text-xs font-medium text-muted-foreground">
                Topic Title
              </label>
              <Input
                id="rename-topic-title"
                value={renameTopicTitle}
                onChange={(e) => setRenameTopicTitle(e.target.value)}
                autoFocus
                required
                maxLength={120}
              />
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={!renameTopicTitle.trim() || isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Topic Dialog */}
      <Dialog open={!!deleteTopicTarget} onOpenChange={(open) => !open && setDeleteTopicTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Topic</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTopicTarget?.title}&rdquo;? If any student has already taken notes under this topic, deletion will be rejected to protect student coursework.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              onClick={handleDeleteTopic}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              <span>Delete Topic</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
