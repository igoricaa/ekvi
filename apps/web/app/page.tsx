"use client";

import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  const { isAuthenticated } = useConvexAuth();

  useEffect(() => {
    if (isAuthenticated) {
      redirect("/dashboard");
    }
  }, [isAuthenticated]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold">Home</h1>
      <div className="flex gap-4 items-center mt-4">
        <Link
          href="/sign-in"
          className={buttonVariants({ variant: "default" })}
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className={buttonVariants({ variant: "secondary" })}
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
