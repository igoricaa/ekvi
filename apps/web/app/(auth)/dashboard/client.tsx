"use client";

import { api } from "@convex/_generated/api";
import { Preloaded, useConvexAuth, usePreloadedQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
// import { SignOutButton } from "@/components/client";
import { UserProfile as UserProfileComponent } from "@/components/server";
import { authClient } from "@/lib/auth-client";

// export function SignOut() {
//   const router = useRouter();

//   const handleSignOut = async () => {
//     await authClient.signOut();
//     router.push("/sign-in");
//   };
//   return <SignOutButton onClick={handleSignOut} />;
// }

export const UserProfile = ({
  preloadedUserQuery,
}: {
  preloadedUserQuery: Preloaded<typeof api.profiles.getCurrentUser>;
}) => {
  const router = useRouter();
  const { isLoading } = useConvexAuth();
  const user = usePreloadedQuery(preloadedUserQuery);

  useEffect(() => {
    if (!isLoading && user === null) {
      authClient.signOut();
      router.push("/sign-in");
    }
  }, [user, isLoading, router]);

  if (!user) {
    return null;
  }

  return (
    <UserProfileComponent
      user={{
        name: user.authUser.name,
        image: user.profile?.profileImage,
        email: user.authUser.email,
      }}
    />
  );
};
