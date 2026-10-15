"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import type { FacultySelection, TeachingAssignment } from "@/contracts/auth";
import type { Section } from "@/contracts/common";
import { setFacultySelection } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SubjectSectionSwitcherProps {
  teaches: TeachingAssignment[];
  initialSelection: FacultySelection | null;
}

export function SubjectSectionSwitcher({
  teaches,
  initialSelection,
}: SubjectSectionSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const defaultAssignment = teaches[0];
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSelection?.subjectId ?? defaultAssignment?.subjectId ?? ""
  );

  const currentAssignment =
    teaches.find((t) => t.subjectId === selectedSubjectId) ?? defaultAssignment;

  const [selectedSection, setSelectedSection] = useState<Section>(
    initialSelection?.section ?? currentAssignment?.sections[0] ?? ("A" as Section)
  );

  const saveSelection = (subjectId: string, section: Section) => {
    setError(null);
    startTransition(async () => {
      const res = await setFacultySelection({ subjectId, section });
      if (!res.ok) {
        setError(res.error.message || "Failed to update selection");
        return;
      }
      router.refresh();
    });
  };

  const handleSubjectChange = (newSubjectId: string) => {
    if (newSubjectId === selectedSubjectId || isPending) return;
    const target = teaches.find((t) => t.subjectId === newSubjectId);
    if (!target) return;
    const newSection = target.sections[0];
    setSelectedSubjectId(newSubjectId);
    setSelectedSection(newSection);
    saveSelection(newSubjectId, newSection);
  };

  const handleSectionChange = (newSection: Section) => {
    if (newSection === selectedSection || isPending) return;
    setSelectedSection(newSection);
    saveSelection(selectedSubjectId, newSection);
  };

  if (!teaches || teaches.length === 0) {
    return null;
  }

  return (
    <div className="relative inline-flex items-center gap-1.5">
      {/* Subject Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs font-medium max-w-[160px] sm:max-w-[200px]"
              disabled={isPending}
              aria-label="Select teaching subject"
            />
          }
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          ) : (
            <span className="truncate">{currentAssignment?.subjectName ?? "Select subject"}</span>
          )}
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Teaches</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {teaches.map((t) => (
            <DropdownMenuItem
              key={t.subjectId}
              onClick={() => handleSubjectChange(t.subjectId)}
              className="flex items-center justify-between text-xs cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="font-medium">{t.subjectName}</span>
                <span className="text-[10px] text-muted-foreground">
                  {t.subjectCode} • Sem {t.semesterNumber}
                </span>
              </div>
              {t.subjectId === selectedSubjectId && (
                <Check className="size-3.5 text-primary shrink-0 ml-2" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Section Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs font-medium"
              disabled={isPending || !currentAssignment}
              aria-label="Select section"
            />
          }
        >
          <span>Sec {selectedSection}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuLabel>Section</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {currentAssignment?.sections.map((sec) => (
            <DropdownMenuItem
              key={sec}
              onClick={() => handleSectionChange(sec)}
              className="flex items-center justify-between text-xs cursor-pointer"
            >
              <span>Section {sec}</span>
              {sec === selectedSection && (
                <Check className="size-3.5 text-primary shrink-0" />
              )}
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
