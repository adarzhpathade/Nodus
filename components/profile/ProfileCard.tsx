"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Check, Laptop, LogOut, Moon, Sun, User } from "lucide-react";
import type { Viewer } from "@/contracts/auth";
import { updateProfile } from "@/lib/actions/auth";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useTheme, type Theme } from "@/components/layout/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ProfileCardProps {
  viewer: Viewer;
}

export function ProfileCard({ viewer }: ProfileCardProps) {
  const router = useRouter();
  const { signOut, isPending: isSigningOut } = useAuthActions();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(viewer.user.name);
  const [isUpdating, startUpdating] = useTransition();
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const handleUpdateName = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;

    setUpdateError(null);
    setUpdateSuccess(false);

    startUpdating(async () => {
      const res = await updateProfile({ name: name.trim() });
      if (!res.ok) {
        setUpdateError(res.error.message || "Failed to update profile name");
        return;
      }
      setUpdateSuccess(true);
      router.refresh();
      setTimeout(() => setUpdateSuccess(false), 3000);
    });
  };

  const themeOptions: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Laptop },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Account Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="size-5" />
              </div>
              <div>
                <CardTitle>{viewer.user.name}</CardTitle>
                <CardDescription>{viewer.user.email}</CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="capitalize">
              {viewer.role}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Role-specific details */}
          {viewer.role === "student" && viewer.profile && (
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-3">
              <div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Program
                </span>
                <p className="mt-0.5 text-xs font-semibold text-foreground">
                  {viewer.profile.branch.name} ({viewer.profile.branch.code})
                </p>
              </div>
              <div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Semester
                </span>
                <p className="mt-0.5 text-xs font-semibold text-foreground">
                  Semester {viewer.profile.currentSemester}
                </p>
              </div>
              <div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Section
                </span>
                <p className="mt-0.5 text-xs font-semibold text-foreground">
                  Section {viewer.profile.section}
                </p>
              </div>
            </div>
          )}

          {viewer.role === "faculty" && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-foreground">Teaching Assignments</span>
              <div className="space-y-2">
                {viewer.profile.teaches.map((t) => (
                  <div
                    key={t.subjectId}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="size-4 text-primary" />
                      <div>
                        <span className="font-semibold text-foreground">{t.subjectName}</span>
                        <span className="text-muted-foreground"> ({t.subjectCode})</span>
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground">
                      <span>Sem {t.semesterNumber} • Sections {t.sections.join(", ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edit Name Form */}
          <form onSubmit={handleUpdateName} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="profile-name" className="text-xs font-medium text-foreground">
                Display Name
              </label>
              <div className="flex gap-2">
                <Input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isUpdating}
                  required
                  className="max-w-md text-xs"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isUpdating || name.trim() === viewer.user.name}
                  className="text-xs"
                >
                  {isUpdating ? "Saving..." : "Save Name"}
                </Button>
              </div>
            </div>

            {updateSuccess && (
              <p className="flex items-center gap-1.5 text-xs text-status-mastered font-medium">
                <Check className="size-3.5" /> Name updated successfully
              </p>
            )}

            {updateError && (
              <p role="alert" className="text-xs text-destructive font-medium">
                {updateError}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Preferences & Theme */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Customize appearance and interface settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-medium text-foreground">Interface Theme</span>
            <div className="grid grid-cols-3 gap-2 max-w-xs">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs text-muted-foreground">
            Sign out of your account on this device
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => signOut()}
            disabled={isSigningOut}
            className="gap-1.5 text-xs"
          >
            <LogOut className="size-3.5" />
            <span>{isSigningOut ? "Signing out..." : "Sign out"}</span>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
