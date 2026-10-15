"use client";
// App-wide client providers (FE-1.12): TanStack Query, theme, Motion config, tooltips.
// Lenis is opt-in per layout via <SmoothScroll> (components/motion/SmoothScroll.tsx).
// The auth provider is added here when BE requests it.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useState } from "react";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Server components load most data; client queries are for panels, search and polling.
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {/* reducedMotion="user": Motion drops transform/layout animations when the OS asks (FE-1.6). */}
        <MotionConfig reducedMotion="user">
          <TooltipProvider delay={300}>{children}</TooltipProvider>
        </MotionConfig>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
