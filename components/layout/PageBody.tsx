import { cn } from "@/lib/utils";

/** Padded content area under a SectionHeader. Pages own their padding because the shell is full-bleed inside the frame. */
export function PageBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-4 py-6 sm:px-6 md:px-8 md:py-8", className)}>{children}</div>;
}
