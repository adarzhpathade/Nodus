"use client";

import Link from "next/link";
import { LogOut, User } from "lucide-react";
import type { Viewer } from "@/contracts/auth";
import { useAuthActions } from "@/hooks/useAuthActions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Profile dropdown shared by the student and faculty top navs. */
export function UserMenu({ viewer, profileHref }: { viewer: Viewer; profileHref: string }) {
  const { signOut } = useAuthActions();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label="Open user profile menu"
            className="border-border hover:bg-muted size-8 rounded-full p-0"
          />
        }
      >
        <User className="size-3.5 text-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal px-3 py-2.5">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-foreground text-xs font-semibold leading-none">{viewer.user.name}</p>
              <span className="text-label text-signal border-border bg-muted/40 border px-1 py-0.2 text-[10px] tracking-wider">
                {viewer.role === "faculty" ? "FACULTY" : "STUDENT"}
              </span>
            </div>
            <p className="text-muted-foreground text-label truncate font-mono text-[11px] leading-tight">
              {viewer.user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link href={profileHref} className="text-label flex w-full items-center gap-2 px-3 py-2" />}
        >
          <User className="size-3.5" />
          <span>Profile & Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut()}
          className="text-label text-destructive focus:text-destructive hover:bg-destructive/10 flex items-center gap-2 px-3 py-2 cursor-pointer"
        >
          <LogOut className="size-3.5" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
