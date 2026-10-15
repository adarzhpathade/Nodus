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
            <p className="text-foreground text-xs leading-none font-medium">{viewer.user.name}</p>
            <p className="text-muted-foreground text-[11px] leading-none">{viewer.user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link href={profileHref} className="flex w-full items-center gap-2 text-xs" />}
        >
          <User className="size-3.5" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut()}
          className="text-destructive focus:text-destructive flex items-center gap-2 text-xs"
        >
          <LogOut className="size-3.5" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
