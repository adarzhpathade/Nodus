import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getGateway } from "@/lib/gateway";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { PageBody } from "@/components/layout/PageBody";

export const metadata: Metadata = {
  title: "Faculty Profile | NODUS",
  description: "User profile and settings",
};

export default async function FacultyProfilePage() {
  const gateway = getGateway();
  const viewer = await gateway.auth.getViewer();

  if (!viewer) {
    redirect("/login");
  }

  return (
    <PageBody className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Faculty Profile</h1>
        <p className="text-muted-foreground text-sm">Manage your faculty details and preferences.</p>
      </div>
      <ProfileCard viewer={viewer} />
    </PageBody>
  );
}
