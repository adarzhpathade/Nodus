import { redirect } from "next/navigation";
import { getGateway } from "@/lib/gateway";
import { FacultyTopNav } from "@/components/layout/FacultyTopNav";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageTransition } from "@/components/motion/PageTransition";

export default async function FacultyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <FacultyTopNav
        viewer={viewer}
        teaches={viewer.profile.teaches}
        selection={selection}
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
