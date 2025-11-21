import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { AppContainer } from "@/components/server";
import { AppSidebar } from "@/components/server/sidebar/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      {/* <SidebarTrigger /> */}
      <AppContainer>
        <EmailVerificationBanner />
        {children}
      </AppContainer>
    </SidebarProvider>
  );
}
