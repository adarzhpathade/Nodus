"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BranchOption } from "@/contracts/auth";
import type { SemesterNumber, Section } from "@/contracts/common";
import { completeOnboarding } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface OnboardingFormProps {
  branches: BranchOption[];
}

export function OnboardingForm({ branches }: OnboardingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [branchId, setBranchId] = useState<string>(branches[0]?.id ?? "");
  const selectedBranch = branches.find((b) => b.id === branchId) ?? branches[0];

  const [currentSemester, setCurrentSemester] = useState<number>(
    selectedBranch?.semesters[0] ?? 1
  );
  const [section, setSection] = useState<string>(
    selectedBranch?.sections[0] ?? "A"
  );

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);

  const handleBranchChange = (newBranchId: string) => {
    setBranchId(newBranchId);
    const branch = branches.find((b) => b.id === newBranchId);
    if (branch) {
      if (!branch.semesters.includes(currentSemester as SemesterNumber)) {
        setCurrentSemester(branch.semesters[0] ?? 1);
      }
      if (!branch.sections.includes(section as Section)) {
        setSection(branch.sections[0] ?? "A");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!branchId || !currentSemester || !section) return;

    setFormError(null);
    setFieldErrors(null);

    startTransition(async () => {
      const res = await completeOnboarding({
        branchId,
        currentSemester: Number(currentSemester) as SemesterNumber,
        section: section as Section,
      });

      if (!res.ok) {
        setFormError(res.error.message || "Failed to complete onboarding.");
        if (res.error.fieldErrors) {
          setFieldErrors(res.error.fieldErrors);
        }
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to NODUS</CardTitle>
        <CardDescription>
          Select your academic branch, current semester, and section to configure your syllabus graph
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="rounded-md bg-destructive/10 p-3 text-xs font-medium text-destructive"
            >
              {formError}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="onboarding-branch" className="text-xs font-medium text-foreground">
              Branch / Program
            </label>
            <select
              id="onboarding-branch"
              value={branchId}
              onChange={(e) => handleBranchChange(e.target.value)}
              disabled={isPending}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
            {fieldErrors?.branchId && (
              <p className="text-xs text-destructive">{fieldErrors.branchId.join(", ")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="onboarding-semester" className="text-xs font-medium text-foreground">
              Current Semester
            </label>
            <select
              id="onboarding-semester"
              value={currentSemester}
              onChange={(e) => setCurrentSemester(Number(e.target.value))}
              disabled={isPending}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
            >
              {selectedBranch?.semesters.map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
            {fieldErrors?.currentSemester && (
              <p className="text-xs text-destructive">{fieldErrors.currentSemester.join(", ")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="onboarding-section" className="text-xs font-medium text-foreground">
              Section
            </label>
            <select
              id="onboarding-section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              disabled={isPending}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
            >
              {selectedBranch?.sections.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
            {fieldErrors?.section && (
              <p className="text-xs text-destructive">{fieldErrors.section.join(", ")}</p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Setting up your syllabus..." : "Get Started"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
