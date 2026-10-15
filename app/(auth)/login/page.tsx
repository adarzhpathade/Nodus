import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In | NODUS",
  description: "Sign in to your NODUS account",
};

export default function LoginPage() {
  return <LoginForm />;
}
