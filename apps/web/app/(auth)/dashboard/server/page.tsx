import { api } from "@convex/_generated/api";
import { preloadQuery } from "convex/nextjs";
import Link from "next/link";
import {
  AppContainer,
  AppHeader,
  AppNav,
  SettingsButton,
  SettingsButtonContent,
} from "@/components/server";
import { getToken } from "@/lib/auth-server";
import { SignOut, UserProfile } from "./client";

const Header = async () => {
  const token = await getToken();

  // Preload query for SSR
  const preloadedUserQuery = await preloadQuery(
    api.profiles.getCurrentUser,
    {},
    { token }
  );

  return (
    <AppHeader>
      <UserProfile preloadedUserQuery={preloadedUserQuery} />
      <AppNav>
        <SettingsButton>
          <Link href="/settings">
            <SettingsButtonContent />
          </Link>
        </SettingsButton>
        <SignOut />
      </AppNav>
    </AppHeader>
  );
};

const ServerPage = async () => {
  return (
    <AppContainer>
      <Header />
    </AppContainer>
  );
};

export default ServerPage;
