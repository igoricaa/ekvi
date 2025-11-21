import { api } from "@convex/_generated/api";
import { preloadQuery } from "convex/nextjs";
import { getAuthToken } from "@/lib/auth-server";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "../../ui/sidebar";
import { NavUser } from "./nav-user";

// https://ui.shadcn.com/blocks/sidebar#sidebar-07
export async function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const token = await getAuthToken();

  // Preload query for SSR
  const preloadedUserQuery = await preloadQuery(
    api.profiles.getCurrentUser,
    {},
    { token }
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>EKVI</SidebarHeader>
      <SidebarContent>
        <SidebarGroup />
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter>
        <NavUser preloadedUserQuery={preloadedUserQuery} />
      </SidebarFooter>
    </Sidebar>
  );
}
