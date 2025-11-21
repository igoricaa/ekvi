"use client";

import { api } from "@convex/_generated/api";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Preloaded } from "convex/react";
import { useMutation, usePreloadedQuery } from "convex/react";
import { Dumbbell, User } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type OnboardingFormValues,
  onboardingSchema,
} from "@/lib/validations/user-schemas";

type OnboardingFormProps = {
  preloadedUserQuery: Preloaded<typeof api.profiles.getCurrentUser>;
};

export function OnboardingForm({ preloadedUserQuery }: OnboardingFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = usePreloadedQuery(preloadedUserQuery);
  const createProfile = useMutation(api.profiles.createProfile);
  const [selectedRole, setSelectedRole] = useState<"athlete" | "coach" | null>(
    null
  );

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      location: "",
    },
  });

  // Pre-fill display name from auth user
  useEffect(() => {
    if (currentUser?.authUser?.name && !form.getValues("displayName")) {
      form.setValue("displayName", currentUser.authUser.name);
    }
  }, [currentUser, form]);

  // Show verification toasts
  useEffect(() => {
    const verified = searchParams.get("verified");
    const alreadyVerified = searchParams.get("already_verified");
    const error = searchParams.get("error");

    if (verified === "true") {
      toast.success("Welcome! Your email has been verified. ✓");
    } else if (alreadyVerified === "true" || error === "already_verified") {
      toast.info("Your email is already verified.");
    } else if (error) {
      toast.error(
        "Verification link is invalid or expired. Please try signing in."
      );
    }

    // Clean up URL if any params exist
    if (verified || alreadyVerified || error) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [searchParams]);

  const onSubmit = async (data: OnboardingFormValues) => {
    try {
      await createProfile({
        displayName: data.displayName,
        role: data.role,
        bio: data.bio,
        location: data.location,
      });
      toast.success("Welcome! Your profile has been created.");
      router.push("/dashboard");
    } catch {
      toast.error("Failed to create profile. Please try again.");
    }
  };

  return (
    <div className="container max-w-3xl mx-auto py-10 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Complete Your Profile</h1>
        <p className="text-muted-foreground">
          Let's get you set up on EKVILIBRIJUM
        </p>
      </div>

      {selectedRole ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedRole === "athlete" ? "Athlete Profile" : "Coach Profile"}
            </CardTitle>
            <CardDescription>
              Tell us a bit about yourself
              <Button
                variant="link"
                size="sm"
                className="ml-2"
                onClick={() => {
                  setSelectedRole(null);
                  form.resetField("role");
                }}
              >
                Change role
              </Button>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your display name" {...field} />
                      </FormControl>
                      <FormDescription>
                        This is how your name will appear to others
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={
                            selectedRole === "athlete"
                              ? "Tell coaches about your fitness goals..."
                              : "Tell athletes about your coaching experience..."
                          }
                          className="resize-none"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="City, Country" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting
                    ? "Creating profile..."
                    : "Complete Setup"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card
            className="cursor-pointer hover:border-orange-400 transition-colors"
            onClick={() => {
              setSelectedRole("athlete");
              form.setValue("role", "athlete");
            }}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <User className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle>I'm an Athlete</CardTitle>
              <CardDescription>
                Looking for a coach to help me reach my fitness goals
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer hover:border-orange-400 transition-colors"
            onClick={() => {
              setSelectedRole("coach");
              form.setValue("role", "coach");
            }}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <Dumbbell className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle>I'm a Coach</CardTitle>
              <CardDescription>
                Ready to help athletes achieve their full potential
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )}
    </div>
  );
}
