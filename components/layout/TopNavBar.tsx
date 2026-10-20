"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Applied OUTSIDE cn(): tailwind-merge treats text-label as a text colour/size and would drop it
// (or the colour) when merged with text-signal / text-foreground.
const LABEL = "text-label";

export interface NavChildItem {
  href: string;
  label: string;
  description?: string;
}

export interface NavItem {
  label: string;
  href?: string;
  children?: NavChildItem[];
}

interface TopNavBarProps {
  homeHref: string;
  /** Small mono tag next to the logo, e.g. "Faculty". */
  tag?: string;
  links: NavItem[];
  /** Optional right-hand controls: switcher, search, bell, profile. */
  children?: React.ReactNode;
}

/** Architectural corner bracket notch: bottom-right `⌟` or top-right `⌝` from nav.png */
function CornerNotch({
  position = "bottom-right",
  className,
}: {
  position?: "bottom-right" | "top-right";
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 8 8"
      className={cn("size-2 stroke-current fill-none select-none", className)}
    >
      {position === "bottom-right" ? (
        <path d="M1 7h6V1" strokeWidth="1" strokeLinecap="square" />
      ) : (
        <path d="M1 1h6v6" strokeWidth="1" strokeLinecap="square" />
      )}
    </svg>
  );
}

/** Dropdown nav cell that opens on hover and inverts to solid ink per nav.png */
function NavDropdownCell({
  link,
  pathname,
  active,
}: {
  link: NavItem;
  pathname: string;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative flex items-stretch h-full"
    >
      {/* Trigger cell button - opens ONLY on hover */}
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${link.label} menu`}
        className={`${LABEL} ${cn(
          "group border-border relative flex h-full w-32 flex-col justify-between border-l px-3 pt-2.5 pb-2 text-left transition-colors sm:w-36 lg:w-40 cursor-pointer outline-none select-none",
          open
            ? "bg-foreground text-background"
            : active
              ? "text-signal bg-muted/20 after:bg-signal after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px]"
              : "text-foreground hover:bg-muted/70",
        )}`}
      >
        {/* Label */}
        <span className={cn("truncate whitespace-nowrap", open && "text-background")}>
          {link.label}
        </span>

        {/* Bottom row: bottom-right corner notch */}
        <div className="flex items-end justify-end w-full mt-auto">
          <CornerNotch
            position="bottom-right"
            className={cn(
              "transition-colors",
              open
                ? "text-background"
                : active
                  ? "text-signal"
                  : "text-muted-foreground/80 group-hover:text-foreground",
            )}
          />
        </div>
      </button>

      {/* Dropdown column matches the EXACT width of the parent cell */}
      {open && (
        <div
          role="menu"
          aria-label={`${link.label} subcategories`}
          className="absolute top-full left-0 z-50 w-full min-w-full border-x border-b border-border bg-background shadow-none animate-in fade-in-0 duration-100"
        >
          {link.children?.map((child) => {
            const childActive = pathname.startsWith(child.href);
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={() => setOpen(false)}
                className={`${LABEL} ${cn(
                  "border-b border-border last:border-b-0 flex w-full items-center px-3 py-2.5 transition-colors cursor-pointer text-xs font-mono uppercase tracking-wider",
                  childActive
                    ? "text-signal bg-muted/50"
                    : "text-foreground hover:bg-muted/70",
                )}`}
              >
                <span className="truncate">{child.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TopNavBar({ homeHref, tag, links, children }: TopNavBarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLinkActive = (href?: string) => {
    if (!href) return false;
    return href === homeHref ? pathname === href : pathname.startsWith(href);
  };

  const isItemActive = (item: NavItem) => {
    if (item.href) return isLinkActive(item.href);
    if (item.children) return item.children.some((child) => pathname.startsWith(child.href));
    return false;
  };

  return (
    <header className="border-border bg-background sticky top-0 z-40 flex h-13 items-stretch border-b">
      {/* Brand logo cell */}
      <Link
        href={homeHref}
        className="text-display border-border group flex items-center gap-2.5 border-r px-4 text-xl transition-colors hover:bg-muted/40 sm:px-6"
      >
        <span className="tracking-tight">NODUS</span>
        {tag ? (
          <span className="text-label text-signal border-border bg-muted/30 border px-1.5 py-0.5 tracking-wider text-[10px]">
            {tag}
          </span>
        ) : null}
      </Link>

      {/* Main navigation links as bordered grid cells */}
      <nav aria-label="Main" className="border-border ml-auto hidden md:flex items-stretch border-r">
        {links.map((link) => {
          const active = isItemActive(link);

          // Dropdown cell if link has sub-items
          if (link.children && link.children.length > 0) {
            return (
              <NavDropdownCell
                key={link.label}
                link={link}
                pathname={pathname}
                active={active}
              />
            );
          }

          // Single direct link cell
          return (
            <Link
              key={link.href || link.label}
              href={link.href || "#"}
              aria-current={active ? "page" : undefined}
              className={`${LABEL} ${cn(
                "group border-border relative flex w-32 flex-col justify-between border-l px-3 pt-2.5 pb-2 transition-colors sm:w-36 lg:w-40",
                active
                  ? "text-signal bg-muted/20 after:bg-signal after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px]"
                  : "text-foreground hover:bg-muted/70",
              )}`}
            >
              <span className="truncate">{link.label}</span>
              <ArrowUpRight
                aria-hidden="true"
                className="text-signal size-3 self-end opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
              />
            </Link>
          );
        })}
      </nav>

      {/* Right controls cell (rendered only when controls are passed) */}
      {children ? (
        <div className="border-border ml-auto hidden md:flex items-center gap-2.5 border-l px-3 sm:px-5">
          {children}
        </div>
      ) : null}

      {/* Mobile navigation drawer trigger */}
      <div className="border-border ml-auto flex items-center border-l px-3 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="border-border border"
                aria-label="Open navigation menu"
              />
            }
          >
            <Menu className="size-4" />
          </SheetTrigger>
          <SheetContent side="right" className="rounded-none border-l border-border bg-popover shadow-none w-72 p-0">
            <SheetHeader className="border-border border-b p-5">
              <SheetTitle className="text-display text-left text-2xl">NODUS</SheetTitle>
            </SheetHeader>
            <nav aria-label="Mobile" className="flex flex-col">
              {links.map((link) => {
                if (link.children && link.children.length > 0) {
                  return (
                    <div key={link.label} className="border-border border-b">
                      <div className="text-label text-muted-foreground flex items-center justify-between px-5 pt-3.5 pb-1 font-mono text-[11px]">
                        <span>[{link.label.toUpperCase()}]</span>
                        <CornerNotch className="text-muted-foreground/60" />
                      </div>
                      {link.children.map((child) => {
                        const childActive = pathname.startsWith(child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setMobileOpen(false)}
                            aria-current={childActive ? "page" : undefined}
                            className={`${LABEL} ${cn(
                              "border-border relative flex items-center justify-between border-t px-5 py-3.5 transition-colors",
                              childActive ? "text-signal bg-muted/30" : "text-foreground hover:bg-muted",
                            )}`}
                          >
                            <div className="flex items-center gap-2.5">
                              {childActive ? <span aria-hidden="true" className="bg-signal size-2" /> : null}
                              <span>{child.label}</span>
                            </div>
                            <ArrowUpRight
                              aria-hidden="true"
                              className={cn("size-3.5 transition-opacity", childActive ? "text-signal opacity-100" : "opacity-0")}
                            />
                          </Link>
                        );
                      })}
                    </div>
                  );
                }

                const active = isItemActive(link);
                return (
                  <Link
                    key={link.href || link.label}
                    href={link.href || "#"}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`${LABEL} ${cn(
                      "border-border relative flex items-center justify-between border-b px-5 py-4 transition-colors",
                      active ? "text-signal bg-muted/30" : "text-foreground hover:bg-muted",
                    )}`}
                  >
                    <div className="flex items-center gap-2.5">
                      {active ? <span aria-hidden="true" className="bg-signal size-2" /> : null}
                      <span>{link.label}</span>
                    </div>
                    <ArrowUpRight
                      aria-hidden="true"
                      className={cn("size-3.5 transition-opacity", active ? "text-signal opacity-100" : "opacity-0")}
                    />
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
