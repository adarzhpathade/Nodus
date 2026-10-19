import { GitFork, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface GraphEmptyStateProps {
  title?: string;
  description?: string;
  role?: "student" | "faculty";
}

export function GraphEmptyState({
  title = "No Curriculum Nodes Found",
  description = "No subjects or units are currently mapped for this semester.",
  role = "student",
}: GraphEmptyStateProps) {
  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[500px] border border-border bg-blueprint flex flex-col items-center justify-center p-8 text-center select-none">
      <div className="border border-border bg-card p-8 max-w-md w-full space-y-4">
        <div className="size-12 border border-border bg-muted/40 mx-auto flex items-center justify-center text-signal">
          <GitFork className="size-6" />
        </div>

        <div>
          <span className="text-label text-muted-foreground block mb-1">
            [STATUS: EMPTY TREE]
          </span>
          <h3 className="font-heading text-lg font-semibold uppercase text-foreground">
            {title}
          </h3>
          <p className="font-mono text-xs text-muted-foreground mt-2">
            {description}
          </p>
        </div>

        <div className="pt-2">
          {role === "faculty" ? (
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/faculty/content" />}
              className="gap-1.5 font-mono text-xs uppercase"
            >
              <span>Manage Syllabus Content</span>
              <ArrowUpRight className="size-3.5 text-signal" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/dashboard" />}
              className="gap-1.5 font-mono text-xs uppercase"
            >
              <span>Return to Dashboard</span>
              <ArrowUpRight className="size-3.5 text-signal" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
