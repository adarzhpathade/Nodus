"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Applied OUTSIDE cn(): tailwind-merge treats text-label as a text colour/size and would drop it
// (or the colour) when merged with text-signal / text-foreground.
const LABEL = "text-label";

export interface NavItem {
  href: string;
  label: string;
}

interface TopNavBarProps {
  homeHref: string;
  /** Small mono tag next to the logo, e.g. "Faculty". */
  tag?: string;
  links: NavItem[];
  /** Right-hand controls: switcher, search, bell, profile. */
  children: React.ReactNode;
}

/**
 * Top nav as a row of bordered cells (nav.png): logo cell, one cell per link
 * with a mono label and a corner arrow, controls cell on the right.
 * The first link only matches exactly so "Dashboard" is not active everywhere.
 */
export function TopNavBar({ homeHref, tag, links, children }: TopNavBarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === links[0]?.href ? pathname === href : pathname.startsWith(href);

  return (
    <header className="border-border bg-background sticky top-0 z-40 flex h-16 items-stretch border-b lg:h-[72px]">
      <Link href={homeHref} className="text-display flex items-center gap-3 px-4 text-2xl sm:px-6">
        NODUS
        {tag ? <span className="text-label text-signal">{tag}</span> : null}
      </Link>

      <nav aria-label="Main" className="ml-auto hidden md:flex">
        {links.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`${LABEL} ${cn(
                "group border-border relative flex w-24 flex-col justify-between border-l px-3 pt-3 pb-2 transition-colors lg:w-28",
                active ? "text-signal" : "text-foreground hover:bg-muted",
              )}`}
            >
              {active ? (
                <span aria-hidden="true" className="bg-signal absolute top-0 left-0 size-1.5" />
              ) : null}
              {link.label}
              <ArrowUpRight
                aria-hidden="true"
                className="size-3 self-end opacity-0 transition-opacity group-hover:opacity-100"
              />
            </Link>
          );
        })}
      </nav>

      <div className="border-border ml-auto flex items-center gap-2 border-l px-3 sm:px-4 md:ml-0">
        {children}
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
          <SheetContent side="right" className="w-72 p-0">
            <SheetHeader className="border-border border-b p-4">
              <SheetTitle className="text-display text-left text-2xl">NODUS</SheetTitle>
            </SheetHeader>
            <nav aria-label="Mobile" className="flex flex-col">
              {links.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`${LABEL} ${cn(
                      "border-border flex items-center gap-2 border-b px-4 py-4 transition-colors",
                      active ? "text-signal" : "hover:bg-muted",
                    )}`}
                  >
                    {active ? <span aria-hidden="true" className="bg-signal size-1.5" /> : null}
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
