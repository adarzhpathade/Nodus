import { redirect } from "next/navigation";
import { getGateway } from "@/lib/gateway";
import { FacultyTopNav } from "@/components/layout/FacultyTopNav";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { GridFrame } from "@/components/layout/GridFrame";
import { PageTransition } from "@/components/motion/PageTransition";

export default async function FacultyLayout({ children }: { children: React.ReactNode }) {
  const gateway = getGateway();
  const viewer = await gateway.auth.getViewer();

  if (!viewer) {
    redirect("/login");
  }

  if (viewer.role === "student") {
    redirect("/dashboard");
  }

  const selection = await gateway.auth.getFacultySelection();

  return (
    <GridFrame>
      <FacultyTopNav viewer={viewer} teaches={viewer.profile.teaches} selection={selection} />
      <Breadcrumbs />
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
    </GridFrame>
  );
}
