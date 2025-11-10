import { Settings } from "lucide-react";
import Image from "next/image";
import { PropsWithChildren } from "react";
import { Button } from "./ui/button";

export const UserProfile = ({
  user,
}: {
  user?: { name: string; image?: string | null; email: string } | null; // TODO: use preloadedUserQuery instead
}) => {
  return (
    <div className="flex items-center space-x-2">
      {user?.image ? (
        // TODO: or just <img> tag?
        <Image
          src={user.image}
          alt={user.name}
          width={40}
          height={40}
          className="rounded-full size-10 object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-orange-600 dark:text-orange-200 font-medium">
          {user?.name?.[0].toUpperCase()}
        </div>
      )}
      <div>
        <h1 className="font-medium">{user?.name}</h1>
        <p className="text-sm text-neutral-500">{user?.email}</p>
      </div>
    </div>
  );
};

export const AppContainer = ({ children }: PropsWithChildren) => {
  return <div className="min-h-screen w-full p-4 space-y-8">{children}</div>;
};

export const AppHeader = ({ children }: PropsWithChildren) => {
  return (
    <header className="flex items-center justify-between max-w-2xl mx-auto">
      {children}
    </header>
  );
};

export const AppNav = ({ children }: PropsWithChildren) => {
  return <div className="flex items-center gap-2">{children}</div>;
};

export const SettingsButton = ({ children }: PropsWithChildren) => {
  return (
    <Button variant="ghost" size="sm" asChild>
      {children}
    </Button>
  );
};

export const SettingsButtonContent = () => {
  return (
    <div className="flex items-center gap-2">
      <Settings size={16} />
      Settings
    </div>
  );
};
