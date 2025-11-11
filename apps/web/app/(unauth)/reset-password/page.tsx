import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

function ResetPasswordFallback() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-md h-96 animate-pulse bg-muted rounded-lg" />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <Suspense fallback={<ResetPasswordFallback />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
