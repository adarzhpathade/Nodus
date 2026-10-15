// Dev-only playground for the motion wrappers (FE-1.3 – FE-1.6). 404 in production.
// Toggle the OS "reduce motion" setting to check every fallback.
import { notFound } from "next/navigation";
import { MotionLab } from "./MotionLab";

export const metadata = { title: "Motion lab · NODUS" };

export default function MotionLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <MotionLab />;
}
