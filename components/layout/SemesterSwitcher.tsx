"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Lock, Loader2 } from "lucide-react";
import type { Semester } from "@/contracts/curriculum";
import type { SemesterNumber } from "@/contracts/common";
import { setStudentSelection } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface SemesterSwitcherProps {
  semesters: Semester[];
  selectedSemester: SemesterNumber;
}

export function SemesterSwitcher({
  semesters,
  selectedSemester,
}: SemesterSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (sem: Semester) => {
    if (sem.locked || sem.number === selectedSemester || isPending) return;

    setError(null);
    startTransition(async () => {
      const res = await setStudentSelection({ semesterNumber: sem.number });
      if (!res.ok) {
        setError(res.error.message || "Failed to switch semester");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="text-label h-8 gap-2 border-border px-3 hover:bg-muted"
              disabled={isPending}
              aria-label={`Select semester, current is Semester ${selectedSemester}`}
            />
          }
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          ) : (
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground font-mono">SEM</span>
              <span className="font-mono text-foreground font-semibold">
                {selectedSemester < 10 ? `0${selectedSemester}` : selectedSemester}
              </span>
            </span>
          )}
          <ChevronDown className="size-3 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-label text-muted-foreground px-2.5 py-1.5">
            Semesters
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {semesters.map((sem) => (
            <DropdownMenuItem
              key={sem.id}
              disabled={sem.locked || isPending}
              aria-disabled={sem.locked}
              onClick={() => handleSelect(sem)}
              className={cn(
                "text-label flex items-center justify-between px-2.5 py-2 transition-colors cursor-pointer",
                sem.locked && "cursor-not-allowed opacity-40",
                sem.number === selectedSemester && "bg-muted/60 text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <span>Semester {sem.number}</span>
                {sem.isCurrent && (
                  <span className="text-signal font-mono text-[10px] tracking-normal">[CURRENT]</span>
                )}
              </div>
              {sem.locked ? (
                <Lock className="size-3 text-muted-foreground" aria-label="Locked semester" />
              ) : sem.number === selectedSemester ? (
                <Check className="size-3.5 text-signal" aria-label="Selected semester" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {error && (
        <span
          role="alert"
          className="text-label text-destructive absolute -bottom-5 right-0 whitespace-nowrap text-[10px]"
        >
          {error}
        </span>
      )}
    </div>
  );
}
