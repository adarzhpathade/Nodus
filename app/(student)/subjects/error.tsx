"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SubjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Subjects page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
        <AlertCircle className="size-6" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Failed to load subjects</h2>
      <p className="mt-1 text-sm text-muted-foreground max-w-md">
        {error.message || "An unexpected error occurred while fetching your semester subjects."}
      </p>
      <div className="mt-6">
        <Button onClick={reset} variant="outline" className="gap-2">
          <RotateCcw className="size-4" />
          <span>Try again</span>
        </Button>
      </div>
    </div>
  );
}
