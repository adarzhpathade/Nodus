"use client";

import { useState } from "react";
import { FileText, Presentation, Download, ExternalLink, Loader2, AlertCircle, Sparkles } from "lucide-react";
import type { Resource } from "@/contracts/resources";
import { getResourceAccess } from "@/lib/actions/resources";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ResourceListProps {
  resources: Resource[];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ResourceList({ resources }: ResourceListProps) {
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  const handleOpen = async (resource: Resource) => {
    if (openingId) return;
    setOpeningId(resource.id);
    setErrorId(null);

    try {
      const res = await getResourceAccess({ resourceId: resource.id });
      if (res.ok) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      } else {
        setErrorId(resource.id);
      }
    } catch {
      setErrorId(resource.id);
    } finally {
      setOpeningId(null);
    }
  };

  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">
        <FileText className="size-8 text-muted-foreground/60 mb-2" />
        <p className="font-medium">No faculty materials uploaded yet</p>
        <p className="text-xs text-muted-foreground/80 mt-0.5">
          Slides and notes uploaded by your professor will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/60 rounded-xl border border-border/80 bg-card">
      {resources.map((resource) => {
        const isPdf = resource.type === "pdf";
        const isProcessing = resource.ingestion.status === "processing";
        const isReady = resource.ingestion.status === "ready";
        const isFailed = resource.ingestion.status === "failed";
        const isOpening = openingId === resource.id;
        const hasError = errorId === resource.id;

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
                  <Presentation className="size-5 text-amber-500" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {resource.fileName}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mt-0.5">
                  <span className="uppercase">{resource.type}</span>
                  <span>·</span>
                  <span>{formatBytes(resource.sizeBytes)}</span>
                  <span>·</span>
                  <span>By {resource.uploadedBy.name}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              {isReady && (
                <Badge variant="outline" className="gap-1 border-status-mastered/30 text-status-mastered text-[11px]">
                  <Sparkles className="size-3" />
                  <span>AI Indexed</span>
                  {resource.ingestion.pageCount && (
                    <span className="text-muted-foreground">({resource.ingestion.pageCount}p)</span>
                  )}
                </Badge>
              )}
              {isProcessing && (
                <Badge variant="secondary" className="gap-1 text-[11px]">
                  <Loader2 className="size-3 animate-spin" />
                  <span>Indexing for AI...</span>
                </Badge>
              )}
              {isFailed && (
                <Badge variant="destructive" className="gap-1 text-[11px]">
                  <AlertCircle className="size-3" />
                  <span>Index failed</span>
                </Badge>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpen(resource)}
                disabled={isOpening}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                {isOpening ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Opening...</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="size-3.5" />
                    <span>Open / Download</span>
                  </>
                )}
              </Button>
            </div>

            {hasError && (
              <p className="text-xs text-destructive sm:col-span-2">
                Failed to generate download link. Please try again.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
