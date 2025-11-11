"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  type TwoFactorFormValues,
  twoFactorSchema,
} from "@/lib/validations/user-schemas";

export default function Verify2FAPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<TwoFactorFormValues>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: {
      code: "",
    },
  });

  const onSubmit = async (data: TwoFactorFormValues) => {
    setLoading(true);
    try {
      // Better Auth doesn't expose 2FA methods directly via convex plugin
      // This would need to be implemented through Better Auth's standard API
      // For now, show a message that 2FA needs backend setup
      toast.error(
        "2FA verification is not yet configured. Please contact support."
      );
      // TODO: Implement proper 2FA verification with Better Auth
      // await authClient.twoFactor.verifyTotp({ code: data.code });
      // router.push("/");
    } catch {
      toast.error("Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">
              Two-Factor Authentication
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Enter the 6-digit verification code from your authenticator app
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid gap-4"
              >
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="000000"
                          maxLength={6}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="one-time-code"
                          className="text-center text-2xl tracking-widest"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Verify"
                  )}
                </Button>

                <Link href="/sign-in" className="block">
                  <Button variant="ghost" className="w-full" type="button">
                    Back to Sign In
                  </Button>
                </Link>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
