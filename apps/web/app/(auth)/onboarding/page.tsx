import { api } from "@convex/_generated/api";
import { preloadedQueryResult, preloadQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { getAuthToken } from "@/lib/auth-server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const token = await getAuthToken();

  // Preload query for client component (single request)
  const preloadedUserQuery = await preloadQuery(
    api.profiles.getCurrentUser,
    { needImageUrl: false },
    { token }
  );

  // Extract value for server-side checks
  const currentUser = preloadedQueryResult(preloadedUserQuery);

  // Not authenticated - redirect to sign-in
  if (!currentUser) {
    redirect("/sign-in");
  }

  // Already completed onboarding - redirect to dashboard
  if (currentUser.profile) {
    redirect("/dashboard");
  }

  // Show onboarding form
  return <OnboardingForm preloadedUserQuery={preloadedUserQuery} />;
}
