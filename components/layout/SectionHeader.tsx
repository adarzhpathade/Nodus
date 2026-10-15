import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  /** Small mono label above the headline, e.g. "[01] OVERVIEW". */
  eyebrow: string;
  title: string;
  description?: string;
  /** Optional slot under the description (filters, buttons). */
  actions?: React.ReactNode;
  className?: string;
}

/** Mono eyebrow + big uppercase headline + right-aligned description (head-desc-border.png). */
export function SectionHeader({ eyebrow, title, description, actions, className }: SectionHeaderProps) {
  return (
    <header className={cn("border-border grid border-b md:grid-cols-12", className)}>
      <div className="px-6 py-8 md:col-span-7 md:px-8 md:py-10">
        <p className="text-label text-muted-foreground mb-4 flex items-center gap-2">
          <span aria-hidden="true" className="bg-signal size-1.5" />
          {eyebrow}
        </p>
        <h1 className="text-display text-[clamp(2rem,4vw,4rem)]">{title}</h1>
      </div>
      <div className="border-border flex flex-col justify-between gap-4 border-t px-6 py-6 md:col-span-5 md:border-t-0 md:border-l md:px-8 md:py-10">
        {description ? <p className="text-muted-foreground max-w-md text-base">{description}</p> : null}
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
