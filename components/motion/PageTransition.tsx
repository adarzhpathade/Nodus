"use client";
// Route content transition. Use inside a `template.tsx` (re-mounts on navigation) so the
// surrounding shell (sidebar, top bar) stays put and only the page content animates.
import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { distance, duration, ease } from "./tokens";

export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      className={className}
      initial={{ opacity: 0, y: distance.sm, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: duration.base, ease: ease.outExpo }}
    >
      {children}
    </motion.div>
  );
}
