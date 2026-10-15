"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export function useAuthActions() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const signIn = async (input: { email: string; password: string }) => {
    setError(null);
    try {
      const res = await authClient.signIn.email({
        email: input.email,
        password: input.password,
      });
      if (res?.error) {
        const message = res.error.message || "Failed to sign in";
        setError(message);
        return { ok: false as const, error: message };
      }
      startTransition(() => {
        router.push("/dashboard");
        router.refresh();
      });
      return { ok: true as const, data: res?.data };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sign in";
      setError(message);
      return { ok: false as const, error: message };
    }
  };

  const signUp = async (input: { name: string; email: string; password: string }) => {
    setError(null);
    try {
      const res = await authClient.signUp.email({
        email: input.email,
        password: input.password,
        name: input.name,
      });
      if (res?.error) {
        const message = res.error.message || "Failed to create account";
        setError(message);
        return { ok: false as const, error: message };
      }
      startTransition(() => {
        router.push("/dashboard");
        router.refresh();
      });
      return { ok: true as const, data: res?.data };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create account";
      setError(message);
      return { ok: false as const, error: message };
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      await authClient.signOut();
      startTransition(() => {
        router.push("/login");
        router.refresh();
      });
      return { ok: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sign out";
      setError(message);
      return { ok: false as const, error: message };
    }
  };

  return {
    signIn,
    signUp,
    signOut,
    error,
    isPending,
  };
}
