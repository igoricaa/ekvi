import { api } from "@convex/_generated/api";
import { preloadQuery } from "convex/nextjs";
import { getAuthToken } from "@/lib/auth-server";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const token = await getAuthToken();

  const preloadedUser = await preloadQuery(
    api.profiles.getCurrentUser,
    { needImageUrl: true },
    { token }
  );

  return <SettingsClient preloadedUser={preloadedUser} />;
}
