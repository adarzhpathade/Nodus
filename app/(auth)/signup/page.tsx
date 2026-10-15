import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Sign Up | NODUS",
  description: "Create a student account on NODUS",
};

export default function SignupPage() {
  return <SignupForm />;
}
