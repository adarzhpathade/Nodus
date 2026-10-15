import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getGateway } from "@/lib/gateway";
import { OnboardingForm } from "@/components/auth/OnboardingForm";

export const metadata: Metadata = {
  title: "Onboarding | NODUS",
  description: "Set up your student profile on NODUS",
};

export default async function OnboardingPage() {
  const gateway = getGateway();
  const viewer = await gateway.auth.getViewer();

  if (!viewer) {
    redirect("/login");
  }

  if (viewer.role === "faculty" || viewer.profile !== null) {
    redirect("/dashboard");
  }

  const branches = await gateway.auth.listBranches();

  return <OnboardingForm branches={branches} />;
}
