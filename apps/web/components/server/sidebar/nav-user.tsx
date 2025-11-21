"use client";

import { api } from "@convex/_generated/api";
import { Preloaded, useConvexAuth, usePreloadedQuery } from "convex/react";
import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

export function NavUser({
  preloadedUserQuery,
}: {
  preloadedUserQuery: Preloaded<typeof api.profiles.getCurrentUser>;
}) {
  const router = useRouter();
  const { isMobile } = useSidebar();
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

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {user.profile?.profileImage ? (
                <Image
                  src={user.profile?.profileImage || ""}
                  alt={user.authUser.name}
                  width={32}
                  height={32}
                  className="rounded-full size-8 object-cover"
                />
              ) : (
                <div className="size-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-orange-600 dark:text-orange-200 font-medium">
                  {user.authUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {user.authUser.name}
                </span>
                <span className="truncate text-xs">{user.authUser.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal flex items-center gap-2">
              {user.profile?.profileImage ? (
                <Image
                  src={user.profile?.profileImage || ""}
                  alt={user.authUser.name}
                  width={32}
                  height={32}
                  className="rounded-full size-8 object-cover"
                />
              ) : (
                <div className="size-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-orange-600 dark:text-orange-200 font-medium">
                  {user.authUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {user.authUser.name}
                </span>
                <span className="truncate text-xs">{user.authUser.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings />
                  Profil
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <button
                type="button"
                onClick={() => handleSignOut()}
                className="w-full"
              >
                <LogOut />
                Izloguj se
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
