"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

type VerifyState = "loading" | "success" | "error" | "invalid";

export function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<VerifyState>(
    token ? "loading" : "invalid"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState(3);

  // Verify email on mount
  useEffect(() => {
    if (!token) {
      return;
    }

    const verify = async () => {
      try {
        const { error } = await authClient.verifyEmail({
          query: { token },
        });

        if (error) {
          setState("error");
          setErrorMessage(error.message || "Email verification failed");
          return;
        }

        setState("success");
      } catch (error) {
        setState("error");
        setErrorMessage(`An unexpected error occurred: ${error}`);
      }
    };

    verify();
  }, [token]);

  // Auto-redirect after success
  useEffect(() => {
    if (state !== "success") {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push("/onboarding");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state, router]);

  // Invalid token (no token in URL)
  if (state === "invalid") {
    return (
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <XCircle className="h-6 w-6 text-destructive" />
            <CardTitle>Invalid Link</CardTitle>
          </div>
          <CardDescription>
            This email verification link is invalid or missing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/sign-in" className="block">
            <Button className="w-full">Back to Sign In</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (state === "loading") {
    return (
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Verifying your email</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Please wait a moment...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state
  if (state === "success") {
    return (
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div>
              <h2 className="text-lg font-semibold">Email Verified!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your email has been successfully verified.
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                Redirecting to onboarding in {countdown} second
                {countdown !== 1 ? "s" : ""}...
              </p>
            </div>
            <Link href="/onboarding" className="w-full">
              <Button className="w-full" variant="outline">
                Continue Now
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  return (
    <Card className="max-w-md w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <XCircle className="h-6 w-6 text-destructive" />
          <CardTitle>Verification Failed</CardTitle>
        </div>
        <CardDescription>
          {errorMessage || "We couldn't verify your email address."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-sm text-muted-foreground">This could be because:</p>
        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
          <li>The link has expired (valid for 24 hours)</li>
          <li>The link has already been used</li>
          <li>The link is invalid</li>
        </ul>
        <div className="grid gap-2 mt-4">
          <Link href="/sign-in" className="block">
            <Button className="w-full">Back to Sign In</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
