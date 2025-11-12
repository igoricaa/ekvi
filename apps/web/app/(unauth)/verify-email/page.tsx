import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { VerifyEmailContent } from "./verify-email-content";

function LoadingFallback() {
  return (
    <Card className="max-w-md w-full">
      <CardContent className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-5/6" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4">
      <Suspense fallback={<LoadingFallback />}>
        <VerifyEmailContent />
      </Suspense>
    </main>
  );
}
