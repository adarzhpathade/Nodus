"use client";

import { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Presentation,
  Trash2,
  ExternalLink,
  Loader2,
  Sparkles,
  AlertCircle,
  Check,
} from "lucide-react";
import type { Resource } from "@/contracts/resources";
import { getResource, getResourceAccess, deleteResource } from "@/lib/actions/resources";
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

interface ResourceUploaderProps {
  unitId: string;
  unitTitle: string;
  taughtSections: string[];
  initialResources: Resource[];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ResourceUploader({
  unitId,
  unitTitle,
  taughtSections,
  initialResources,
}: ResourceUploaderProps) {
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSections, setSelectedSections] = useState<string[]>(taughtSections);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll processing resources for simulated or real ingestion completion
  useEffect(() => {
    const processing = resources.filter((r) => r.ingestion.status === "processing");
    if (processing.length === 0) return;

    const interval = setInterval(async () => {
      let changed = false;
      const updatedList = await Promise.all(
        resources.map(async (res) => {
          if (res.ingestion.status !== "processing") return res;
          try {
            const result = await getResource({ resourceId: res.id });
            if (result.ok && result.data.ingestion.status !== "processing") {
              changed = true;
              return result.data;
            }
          } catch {
            // Ignore polling error
          }
          return res;
        })
      );

      if (changed) {
        setResources(updatedList);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [resources]);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    setUploadError(null);
    const validExtensions = [".pdf", ".ppt", ".pptx"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setUploadError("Only PDF, PPT, and PPTX files are supported.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setUploadError("File exceeds the 25 MB limit.");
      return;
    }
    setSelectedFile(file);
  };

  const toggleSection = (section: string) => {
    if (selectedSections.includes(section)) {
      if (selectedSections.length === 1) return; // Keep at least one
      setSelectedSections(selectedSections.filter((s) => s !== section));
    } else {
      setSelectedSections([...selectedSections, section]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (selectedSections.length === 0) {
      setUploadError("Select at least one target section.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("unitId", unitId);
      formData.append("visibleSections", selectedSections.join(","));

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error?.message || "Upload failed. Please try again.");
      } else if (data.resource) {
        setResources([data.resource, ...resources]);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch {
      setUploadError("An unexpected error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpen = async (resource: Resource) => {
    if (openingId) return;
    setOpeningId(resource.id);
    try {
      const res = await getResourceAccess({ resourceId: resource.id });
      if (res.ok) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setOpeningId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteResource({ resourceId: deleteTarget.id });
      if (res.ok) {
        setResources(resources.filter((r) => r.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        alert(res.error.message || "Failed to delete resource.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Box */}
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-5 space-y-4">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-card/60 p-6 text-center transition-colors hover:bg-card hover:border-primary/50"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <UploadCloud className="size-5" />
          </div>
          {selectedFile ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(selectedFile.size)} · Click to change file
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Click or drag & drop lecture slides or notes
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, PPT, or PPTX up to 25 MB
              </p>
            </div>
          )}
        </div>

        {uploadError && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Section Visibility & Submit */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Visible to Section(s):
            </span>
            <div className="flex items-center gap-2">
              {taughtSections.map((sec) => {
                const checked = selectedSections.includes(sec);
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => toggleSection(sec)}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      checked
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span
                      className={`size-3 rounded-full border flex items-center justify-center ${
                        checked ? "border-primary bg-primary text-primary-foreground" : "border-border"
                      }`}
                    >
                      {checked && <Check className="size-2 stroke-[3]" />}
                    </span>
                    <span>Section {sec}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            size="sm"
            className="h-9 gap-2 text-xs font-medium"
          >
            {isUploading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Uploading & Starting Ingestion...</span>
              </>
            ) : (
              <>
                <UploadCloud className="size-3.5" />
                <span>Upload to {unitTitle}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Existing Uploads List */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Uploaded Materials ({resources.length})
        </h4>

        {resources.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
            No files uploaded for this unit yet. Use the upload box above to add lecture slides.
          </p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-xl border border-border/80 bg-card overflow-hidden">
            {resources.map((resource) => {
              const isPdf = resource.type === "pdf";
              const isProcessing = resource.ingestion.status === "processing";
              const isReady = resource.ingestion.status === "ready";
              const isFailed = resource.ingestion.status === "failed";
              const isOpening = openingId === resource.id;

              return (
                <li
                  key={resource.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                      {isPdf ? (
                        <FileText className="size-5 text-primary" />
                      ) : (
                        <Presentation className="size-5 text-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {resource.fileName}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground mt-0.5">
                        <span className="uppercase">{resource.type}</span>
                        <span>·</span>
                        <span>{formatBytes(resource.sizeBytes)}</span>
                        <span>·</span>
                        <span>Sections: {resource.visibleSections.join(", ")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    {/* Ingestion Status Badges */}
                    {isProcessing && (
                      <Badge variant="secondary" className="gap-1 text-[11px]">
                        <Loader2 className="size-3 animate-spin" />
                        <span>AI Indexing...</span>
                      </Badge>
                    )}
                    {isReady && (
                      <Badge variant="outline" className="gap-1 border-status-mastered/40 text-status-mastered text-[11px]">
                        <Sparkles className="size-3" />
                        <span>AI Indexed</span>
                        {resource.ingestion.pageCount && (
                          <span className="text-muted-foreground">
                            ({resource.ingestion.pageCount}p)
                          </span>
                        )}
                      </Badge>
                    )}
                    {isFailed && (
                      <Badge variant="destructive" className="gap-1 text-[11px]">
                        <AlertCircle className="size-3" />
                        <span>Failed</span>
                      </Badge>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpen(resource)}
                      disabled={isOpening}
                      className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {isOpening ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <ExternalLink className="size-3.5" />
                      )}
                      <span>View</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(resource)}
                      className="h-8 size-8 p-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Delete ${resource.fileName}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Material</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove &ldquo;{deleteTarget?.fileName}&rdquo;? Students will no longer have access to this document and its AI vector embeddings will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              <span>Delete Document</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
