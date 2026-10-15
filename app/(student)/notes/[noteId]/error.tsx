"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NoteEditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Note editor error caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center animate-in fade-in-50">
      <div className="mb-3 rounded-full bg-destructive/10 p-3 text-destructive">
        <AlertCircle className="size-6" />
      </div>
      <h3 className="font-heading text-base font-semibold text-foreground">
        Unable to load note editor
      </h3>
      <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
        {error.message || "We encountered an issue while loading this note. Please try again."}
      </p>
      <div className="mt-5 flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => reset()} className="gap-1.5 text-xs">
          <RefreshCw className="size-3.5" />
          <span>Try again</span>
        </Button>
        <Button variant="ghost" size="sm" render={<Link href="/notes" />} className="gap-1.5 text-xs">
          <ArrowLeft className="size-3.5" />
          <span>Back to Notes</span>
        </Button>
      </div>
    </div>
  );
}
