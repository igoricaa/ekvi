"use client";

import { api } from "@convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { AlertCircle, Loader2, Mail, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function EmailVerificationBanner() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const currentUser = useQuery(api.profiles.getCurrentUser, {
    needImageUrl: false,
  });
  const resendVerificationEmail = useAction(api.auth.resendVerificationEmail);

  // Loading state - reserve space to prevent layout shift
  if (currentUser === undefined) {
    return <div className="h-12" />;
  }

  // Don't show if not authenticated, already verified, or dismissed
  if (
    !currentUser?.authUser ||
    currentUser.authUser.emailVerified !== false ||
    isDismissed
  ) {
    return null;
  }

  const email = currentUser.authUser.email;

  const handleResend = async () => {
    if (cooldown > 0 || isResending) {
      return;
    }

    try {
      setIsResending(true);
      await resendVerificationEmail();
      toast.success("Verification email sent! Check your inbox.");

      // Set 60 second cooldown
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send email";
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Alert className="rounded-none border-x-0 border-t-0 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400 hidden sm:block" />
          <span className="text-amber-800 dark:text-amber-200">
            Please verify your email address ({email}) to unlock all features.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={isResending || cooldown > 0}
            className="text-xs"
          >
            {isResending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Sending...
              </>
            ) : cooldown > 0 ? (
              `Resend in ${cooldown}s`
            ) : (
              "Resend email"
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="h-6 w-6 p-0"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
