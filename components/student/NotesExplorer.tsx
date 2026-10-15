"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Filter, Plus, FileText, ArrowUpDown, Loader2, Sparkles } from "lucide-react";
import type { NoteSummary, NoteSummaryPage } from "@/contracts/notes";
import { listNotes } from "@/lib/actions/notes";
import { NoteCard, NoteCardSkeleton } from "./NoteCard";
import { CreateNoteDialog, type SubjectWithUnitsAndTopics } from "./CreateNoteDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { cn } from "@/lib/utils";

interface NotesExplorerProps {
  initialData: NoteSummaryPage;
  subjects: SubjectWithUnitsAndTopics[];
  tags: Array<{ tag: string; count: number }>;
  semesterNumber: number;
  initialFilters?: {
    subjectId?: string;
    unitId?: string;
    topicId?: string;
    tag?: string;
    search?: string;
    sort?: "updated" | "created" | "title";
  };
}

export function NotesExplorer({
  initialData,
  subjects,
  tags,
  semesterNumber,
  initialFilters = {},
}: NotesExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters state
  const [search, setSearch] = useState(initialFilters.search || "");
  const [debouncedSearch, setDebouncedSearch] = useState(initialFilters.search || "");
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialFilters.subjectId || "");
  const [selectedUnitId, setSelectedUnitId] = useState(initialFilters.unitId || "");
  const [selectedTopicId, setSelectedTopicId] = useState(initialFilters.topicId || "");
  const [selectedTag, setSelectedTag] = useState(initialFilters.tag || "");
  const [sort, setSort] = useState<"updated" | "created" | "title">(
    initialFilters.sort || "updated"
  );

  // Pagination & items state
  const [notes, setNotes] = useState<NoteSummary[]>(initialData.items);
  const [nextCursor, setNextCursor] = useState<string | null>(initialData.nextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create modal state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Debounce search by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Derived options for dropdowns
  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);
  const availableUnits = currentSubject?.units || [];
  const currentUnit = availableUnits.find((u) => u.id === selectedUnitId);
  const availableTopics = currentUnit?.topics || [];

  // Sync with initialData changes (e.g. semester change from top switcher): adjust state during render
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  if (prevInitialData !== initialData) {
    setPrevInitialData(initialData);
    setNotes(initialData.items);
    setNextCursor(initialData.nextCursor);
  }

  const fetchNotes = async (isInitialMount = false) => {
    if (isInitialMount) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await listNotes({
        semesterNumber,
        subjectId: selectedSubjectId || undefined,
        unitId: selectedUnitId || undefined,
        topicId: selectedTopicId || undefined,
        tag: selectedTag || undefined,
        search: debouncedSearch.trim() || undefined,
        sort,
        limit: 12,
      });

      if (!res.ok) {
        setError(res.error.message || "Failed to load notes.");
        setIsLoading(false);
        return;
      }

      setNotes(res.data.items);
      setNextCursor(res.data.nextCursor);

      // Update URL query params without reloading
      const params = new URLSearchParams();
      if (selectedSubjectId) params.set("subject", selectedSubjectId);
      if (selectedUnitId) params.set("unit", selectedUnitId);
      if (selectedTopicId) params.set("topic", selectedTopicId);
      if (selectedTag) params.set("tag", selectedTag);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (sort !== "updated") params.set("sort", sort);

      const newQuery = params.toString();
      const newPath = newQuery ? `/notes?${newQuery}` : "/notes";
      window.history.replaceState(null, "", newPath);
    } catch {
      setError("An unexpected error occurred while fetching notes.");
    } finally {
      setIsLoading(false);
    }
  };

  // Run fetch whenever filters change
  // The server already rendered the first page, so skip the fetch on the first run.
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    fetchNotes();
  }, [debouncedSearch, selectedSubjectId, selectedUnitId, selectedTopicId, selectedTag, sort]);

  // Handle Load More
  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const res = await listNotes({
        semesterNumber,
        subjectId: selectedSubjectId || undefined,
        unitId: selectedUnitId || undefined,
        topicId: selectedTopicId || undefined,
        tag: selectedTag || undefined,
        search: debouncedSearch.trim() || undefined,
        sort,
        cursor: nextCursor,
        limit: 12,
      });

      if (res.ok) {
        setNotes((prev) => [...prev, ...res.data.items]);
        setNextCursor(res.data.nextCursor);
      }
    } catch {
      // Ignore load more failure
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedSubjectId("");
    setSelectedUnitId("");
    setSelectedTopicId("");
    setSelectedTag("");
    setSort("updated");
  };

  const hasActiveFilters = Boolean(
    search || selectedSubjectId || selectedUnitId || selectedTopicId || selectedTag || sort !== "updated"
  );

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            My Notes
          </h1>
          <p className="text-sm text-muted-foreground">
            {notes.length > 0 ? (
              <span>
                Showing {notes.length} note{notes.length === 1 ? "" : "s"} across Semester {semesterNumber} topics
              </span>
            ) : (
              <span>Personal study notes connected directly to syllabus topics.</span>
            )}
          </p>
        </div>

        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="gap-1.5 self-start sm:self-auto shadow-sm"
        >
          <Plus className="size-4" />
          <span>New Note</span>
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-3 rounded-xl border border-border/80 bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search note titles and contents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Subject Filter */}
          <div className="w-full md:w-48">
            <select
              aria-label="Filter by subject"
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedUnitId("");
                setSelectedTopicId("");
              }}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-xs text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="" className="bg-popover text-foreground">
                All Subjects
              </option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id} className="bg-popover text-foreground">
                  {sub.code} — {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Filter */}
          <div className="w-full md:w-44">
            <select
              aria-label="Filter by unit"
              value={selectedUnitId}
              onChange={(e) => {
                setSelectedUnitId(e.target.value);
                setSelectedTopicId("");
              }}
              disabled={!selectedSubjectId}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-xs text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              <option value="" className="bg-popover text-foreground">
                All Units
              </option>
              {availableUnits.map((u) => (
                <option key={u.id} value={u.id} className="bg-popover text-foreground">
                  Unit {u.order} — {u.title}
                </option>
              ))}
            </select>
          </div>

          {/* Topic Filter */}
          <div className="w-full md:w-44">
            <select
              aria-label="Filter by topic"
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              disabled={!selectedUnitId}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-xs text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              <option value="" className="bg-popover text-foreground">
                All Topics
              </option>
              {availableTopics.map((t) => (
                <option key={t.id} value={t.id} className="bg-popover text-foreground">
                  {t.order}. {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Sort order */}
          <div className="w-full md:w-40">
            <select
              aria-label="Sort notes"
              value={sort}
              onChange={(e) => setSort(e.target.value as "updated" | "created" | "title")}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-xs text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="updated" className="bg-popover text-foreground">
                Recently updated
              </option>
              <option value="created" className="bg-popover text-foreground">
                Recently created
              </option>
              <option value="title" className="bg-popover text-foreground">
                Title (A-Z)
              </option>
            </select>
          </div>
        </div>

        {/* Tag Filters Row */}
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40">
            <span className="text-[11px] font-medium text-muted-foreground mr-1">Tags:</span>
            <button
              type="button"
              onClick={() => setSelectedTag("")}
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-mono transition-colors",
                !selectedTag
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              all
            </button>
            {tags.map((t) => {
              const isSelected = selectedTag.toLowerCase() === t.tag.toLowerCase();
              return (
                <button
                  key={t.tag}
                  type="button"
                  onClick={() => setSelectedTag(isSelected ? "" : t.tag)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-mono transition-colors flex items-center gap-1",
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  )}
                >
                  <span>#{t.tag}</span>
                  <span className="text-[10px] opacity-70">({t.count})</span>
                </button>
              );
            })}

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleClearFilters}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
              >
                Reset filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNotes()}
            className="mt-3 text-xs"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <NoteCardSkeleton key={i} />
          ))}
        </div>
      ) : notes.length === 0 ? (
        /* Empty State */
        <EmptyState
          icon={FileText}
          title={hasActiveFilters ? "No matching notes found" : "No notes written yet"}
          description={
            hasActiveFilters
              ? "Try adjusting your search terms or filters to find what you're looking for."
              : "Connecting your notes to syllabus topics turns your knowledge graph green."
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="size-3.5" />
                <span>Write First Note</span>
              </Button>
            )
          }
        />
      ) : (
        /* Grid of Note Cards */
        <div className="space-y-6">
          <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <StaggerItem key={note.id}>
                <NoteCard
                  note={note}
                  onTagClick={(tag) => setSelectedTag(tag)}
                />
              </StaggerItem>
            ))}
          </Stagger>

          {/* Pagination / Load More */}
          {nextCursor && (
            <div className="pt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="gap-2 text-xs"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Loading more notes...</span>
                  </>
                ) : (
                  <span>Load more notes</span>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create Note Dialog Modal */}
      <CreateNoteDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        subjects={subjects}
        defaultSubjectId={selectedSubjectId}
        defaultUnitId={selectedUnitId}
        defaultTopicId={selectedTopicId}
      />
    </div>
  );
}
