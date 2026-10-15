"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnitError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unit page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
        <AlertCircle className="size-6" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Failed to load unit details</h2>
      <p className="mt-1 text-sm text-muted-foreground max-w-md">
        {error.message || "An error occurred while loading this syllabus unit. Please try again."}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={reset} variant="outline" className="gap-2">
          <RotateCcw className="size-4" />
          <span>Try again</span>
        </Button>
        <Button asChild variant="ghost" className="gap-2">
          <Link href="/subjects">
            <ArrowLeft className="size-4" />
            <span>Back to Subjects</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
