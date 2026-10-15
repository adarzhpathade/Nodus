import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="font-heading text-xl font-bold tracking-tight text-primary">NODUS</span>
          <p className="text-xs text-muted-foreground mt-1">Syllabus knowledge graph & AI tutor</p>
        </div>
        {children}
      </div>
    </div>
  );
}
