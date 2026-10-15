"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut, Menu, Search, User } from "lucide-react";
import type { Viewer } from "@/contracts/auth";
import type { Semester } from "@/contracts/curriculum";
import type { SemesterNumber } from "@/contracts/common";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useQuickSwitcher } from "@/stores/useQuickSwitcher";
import { SemesterSwitcher } from "./SemesterSwitcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface StudentTopNavProps {
  viewer: Viewer;
  semesters: Semester[];
  selectedSemester: SemesterNumber;
}

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/graph", label: "Graph View" },
  { href: "/subjects", label: "Subjects" },
  { href: "/notes", label: "My Notes" },
  { href: "/assignments", label: "Assignments" },
  { href: "/tutor", label: "AI Tutor" },
  { href: "/practice", label: "Practice" },
];

export function StudentTopNav({
  viewer,
  semesters,
  selectedSemester,
}: StudentTopNavProps) {
  const pathname = usePathname();
  const { signOut } = useAuthActions();
  const openQuickSwitcher = useQuickSwitcher((s) => s.open);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left: Mobile trigger & Logo & Desktop Nav */}
        <div className="flex items-center gap-4 lg:gap-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="md:hidden"
                  aria-label="Open navigation menu"
                />
              }
            >
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <SheetHeader>
                <SheetTitle className="text-left font-bold text-primary">NODUS</SheetTitle>
              </SheetHeader>
              <nav className="mt-4 flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm transition-colors",
                      isActive(link.href)
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight text-primary"
          >
            NODUS
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs transition-colors",
                  isActive(link.href)
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Semester switcher, Search, Bell, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          <SemesterSwitcher
            semesters={semesters}
            selectedSemester={selectedSemester}
          />

          <button
            type="button"
            onClick={openQuickSwitcher}
            aria-label="Search syllabus and notes (Ctrl+K)"
            className="hidden sm:flex items-center gap-2 rounded-lg border border-input bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <Search className="size-3.5" />
            <span>Search...</span>
            <kbd className="pointer-events-none rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono">
              Ctrl K
            </kbd>
          </button>

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Notifications"
            className="text-muted-foreground hover:text-foreground"
          >
            <Bell className="size-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Open user profile menu"
                  className="rounded-full"
                />
              }
            >
              <User className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-medium leading-none text-foreground">
                    {viewer.user.name}
                  </p>
                  <p className="text-[11px] leading-none text-muted-foreground">
                    {viewer.user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={
                  <Link
                    href="/profile"
                    className="flex w-full items-center gap-2 text-xs"
                  />
                }
              >
                <User className="size-3.5" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="flex items-center gap-2 text-xs text-destructive focus:text-destructive"
              >
                <LogOut className="size-3.5" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
