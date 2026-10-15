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
              className="h-8 gap-1.5 px-2.5 text-xs font-medium"
              disabled={isPending}
              aria-label={`Select semester, current is Semester ${selectedSemester}`}
            />
          }
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          ) : (
            <span>Sem {selectedSemester}</span>
          )}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Semesters</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {semesters.map((sem) => (
            <DropdownMenuItem
              key={sem.id}
              disabled={sem.locked || isPending}
              aria-disabled={sem.locked}
              onClick={() => handleSelect(sem)}
              className={cn(
                "flex items-center justify-between text-xs",
                sem.locked && "cursor-not-allowed opacity-50"
              )}
            >
              <div className="flex items-center gap-1.5">
                <span>Semester {sem.number}</span>
                {sem.isCurrent && (
                  <span className="text-[10px] text-muted-foreground">(Current)</span>
                )}
              </div>
              {sem.locked ? (
                <Lock className="size-3 text-muted-foreground" aria-label="Locked semester" />
              ) : sem.number === selectedSemester ? (
                <Check className="size-3.5 text-primary" aria-label="Selected semester" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {error && (
        <span
          role="alert"
          className="absolute -bottom-5 right-0 whitespace-nowrap text-[10px] font-medium text-destructive"
        >
          {error}
        </span>
      )}
    </div>
  );
}
