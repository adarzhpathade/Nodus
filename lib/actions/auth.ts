"use server";
// Auth & profile mutations. Sign-in/up/out use `authClient` from "@/lib/auth/client" instead. Owner: BE.
import { FacultySelection, OnboardingInput, StudentSelection, UpdateProfileInput } from "@/contracts/auth";
import { getGateway } from "@/lib/gateway";
import { runAction } from "./result";

export async function completeOnboarding(input: OnboardingInput) {
  return runAction(OnboardingInput, input, (data) => getGateway().auth.completeOnboarding(data));
}

export async function updateProfile(input: UpdateProfileInput) {
  return runAction(UpdateProfileInput, input, (data) => getGateway().auth.updateProfile(data));
}

export async function setStudentSelection(input: StudentSelection) {
  return runAction(StudentSelection, input, (data) => getGateway().auth.setStudentSelection(data));
}

export async function setFacultySelection(input: FacultySelection) {
  return runAction(FacultySelection, input, (data) => getGateway().auth.setFacultySelection(data));
}
