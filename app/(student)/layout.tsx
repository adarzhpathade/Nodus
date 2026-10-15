import { redirect } from "next/navigation";
import { getGateway } from "@/lib/gateway";
import { StudentTopNav } from "@/components/layout/StudentTopNav";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageTransition } from "@/components/motion/PageTransition";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <StudentTopNav
        viewer={viewer}
        semesters={semesters}
        selectedSemester={selection.semesterNumber}
      />
      <div className="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6">
        <Breadcrumbs />
      </div>
      <main className="flex-1 pb-12 pt-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
