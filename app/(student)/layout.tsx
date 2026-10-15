import { redirect } from "next/navigation";
import { getGateway } from "@/lib/gateway";
import { StudentTopNav } from "@/components/layout/StudentTopNav";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { QuickSwitcher } from "@/components/editor/QuickSwitcher";
import { GridFrame } from "@/components/layout/GridFrame";
import { PageTransition } from "@/components/motion/PageTransition";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const gateway = getGateway();
  const viewer = await gateway.auth.getViewer();

  if (!viewer) {
    redirect("/login");
  }

  if (viewer.role === "faculty") {
    redirect("/faculty/dashboard");
  }

  if (viewer.profile === null) {
    redirect("/onboarding");
  }

  const [semesters, selection] = await Promise.all([
    gateway.curriculum.listSemesters(),
    gateway.auth.getStudentSelection(),
  ]);

  return (
    <GridFrame>
      <StudentTopNav viewer={viewer} semesters={semesters} selectedSemester={selection.semesterNumber} />
      <Breadcrumbs />
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <QuickSwitcher />
    </GridFrame>
  );
}
