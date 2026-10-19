"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GraphErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function GraphErrorState({
  message = "Failed to load syllabus graph data.",
  onRetry,
}: GraphErrorStateProps) {
  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[500px] border border-border bg-blueprint flex flex-col items-center justify-center p-8 text-center select-none">
      <div className="border border-destructive/50 bg-card p-8 max-w-md w-full space-y-4">
        <div className="size-12 border border-destructive bg-destructive/10 mx-auto flex items-center justify-center text-destructive">
          <AlertTriangle className="size-6" />
        </div>

        <div>
          <span className="text-label text-destructive block mb-1">
            [ERROR: GRAPH RETRIEVAL FAILED]
          </span>
          <h3 className="font-heading text-lg font-semibold uppercase text-foreground">
            Curriculum Tree Unavailable
          </h3>
          <p className="font-mono text-xs text-muted-foreground mt-2">
            {message}
          </p>
        </div>

        {onRetry && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="gap-1.5 font-mono text-xs uppercase"
            >
              <RotateCw className="size-3.5" />
              <span>Retry Request</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
