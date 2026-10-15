"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Notes error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center animate-in fade-in-50">
      <div className="mb-3 rounded-full bg-destructive/10 p-3 text-destructive">
        <AlertCircle className="size-6" />
      </div>
      <h3 className="font-heading text-base font-semibold text-foreground">
        Unable to load notes
      </h3>
      <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
        {error.message || "We encountered an issue while loading your notes. Please try again."}
      </p>
      <div className="mt-5 flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => reset()} className="gap-1.5 text-xs">
          <RefreshCw className="size-3.5" />
          <span>Try again</span>
        </Button>
        <Button variant="ghost" size="sm" render={<Link href="/dashboard" />} className="text-xs">
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
