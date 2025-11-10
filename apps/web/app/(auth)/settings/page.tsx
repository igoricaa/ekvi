"use client";

import { api } from "@convex/_generated/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { EditIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  type ProfileUpdateFormValues,
  profileUpdateSchema,
  UploadImageFormValues,
  uploadImageSchema,
} from "@/lib/validations/user-schemas";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";

export default function SettingsPage() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Skip query when deleting to prevent "Unauthenticated" error
  const currentUser = useQuery(api.profiles.getCurrentUser, {
    needImageUrl: true,
  });
  const updateProfile = useMutation(api.profiles.updateProfile);
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);
  const deleteCurrentUserProfile = useMutation(
    api.profiles.deleteCurrentUserProfile
  );
  const removeProfileImage = useMutation(
    api.profiles.removeCurrentUserProfileImage
  );

  const form = useForm<ProfileUpdateFormValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      location: "",
    },
  });

  const uploadImageForm = useForm<UploadImageFormValues>({
    resolver: zodResolver(uploadImageSchema),
    defaultValues: {
      image: undefined,
    },
  });

  // Update form when user data loads
  useEffect(() => {
    if (currentUser?.profile) {
      form.reset({
        displayName: currentUser.profile.displayName || "",
        bio: currentUser.profile.bio || "",
        location: currentUser.profile.location || "",
      });
    }
  }, [currentUser, form]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setIsPreviewOpen(true); // Open preview dialog when ready
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage) {
      return null;
    }

    try {
      setIsUploading(true);

      const uploadUrl = await generateUploadUrl();

      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedImage.type },
        body: selectedImage,
      });

      if (!result.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await result.json();

      setIsUploading(false);
      return storageId;
    } catch (error) {
      setIsUploading(false);
      throw error;
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedImage) {
      return;
    }

    try {
      setIsUploading(true);
      const storageId = await handleImageUpload();

      if (storageId) {
        await updateProfile({ profileImage: storageId });
        toast.success("Fotografija je uspešno promenjena!");
        setIsPreviewOpen(false);
        setImagePreview(null);
        setSelectedImage(null);
      }
    } catch {
      toast.error("Greška pri promeni fotografije. Pokušajte ponovo.");
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: ProfileUpdateFormValues) => {
    try {
      await updateProfile({
        displayName: data.displayName,
        bio: data.bio,
        location: data.location,
      });

      toast.success("Profile updated successfully!");
    } catch {
      toast.error("Failed to update profile. Please try again.");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      await deleteCurrentUserProfile();
      await authClient.deleteUser();

      toast.success("Account deleted successfully");

      setTimeout(() => {
        router.push("/sign-in");
      }, 300);
    } catch {
      setIsDeleting(false);
      toast.error("Failed to delete account. Please try again.");
    }
  };

  // Show loading state while deleting account
  if (isDeleting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="animate-spin" size={32} />
        <p className="text-muted-foreground">Deleting account...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!currentUser.profile) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Complete Onboarding</CardTitle>
            <CardDescription>
              Please complete your profile setup to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You need to complete the onboarding process before accessing your
              settings.
            </p>
            <Button asChild className="w-full">
              <a href="/onboarding">Complete Onboarding</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and profile
        </p>
      </div>

      <div className="mb-6">
        <div className="relative inline-block">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <div>
                {currentUser.profile.profileImage ? (
                  <Image
                    src={currentUser.profile.profileImage || ""}
                    alt="Profile Image"
                    width={160}
                    height={160}
                    className="object-cover rounded-full cursor-pointer size-40"
                  />
                ) : (
                  <div className="size-40 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-orange-600 dark:text-orange-200 font-medium">
                    {currentUser.profile.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Form {...uploadImageForm}>
                  <form
                    onSubmit={uploadImageForm.handleSubmit(handleImageUpload)}
                  >
                    <FormField
                      control={uploadImageForm.control}
                      name="image"
                      render={() => (
                        <FormItem>
                          <FormLabel
                            className={cn(
                              buttonVariants({ variant: "ghost" }),
                              "pl-3"
                            )}
                          >
                            Promeni fotografiju
                          </FormLabel>

                          <FormControl className="hidden">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleImageSelect}
                              disabled={isUploading}
                              className={cn(
                                "cursor-pointer",
                                isUploading && "opacity-50"
                              )}
                              placeholder="Odaberi fotografiju"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </DropdownMenuItem>

              {currentUser.profile.profileImage && (
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        Izbriši fotografiju
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Da li ste sigurni?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Ova akcija ne može biti poništena.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Odustani</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            await removeProfileImage();
                            toast.success("Fotografija je izbrisana");
                          }}
                        >
                          Izbriši fotografiju
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Edit icon overlay */}
          <div className="absolute bottom-2 right-2 rounded-full bg-background p-1.5 shadow-md border border-border pointer-events-none">
            <EditIcon size={16} className="text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pregled profilne fotografije</DialogTitle>
            <DialogDescription>
              Pregledajte svoju fotografiju pre učitavanja
            </DialogDescription>
          </DialogHeader>

          {imagePreview && (
            <Image
              src={imagePreview}
              alt="Profile Image Preview"
              width={256}
              height={256}
              className="object-cover rounded-full cursor-pointer size-64"
            />
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsPreviewOpen(false);
                setImagePreview(null);
                setSelectedImage(null);
              }}
            >
              Odustani
            </Button>
            <Button
              type="button"
              onClick={handleConfirmUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Učitavam...
                </>
              ) : (
                "Potvrdi i učitaj"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your profile details and personal information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about yourself..."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A brief description about yourself (max 500 characters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="City, Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="flex-1"
                >
                  {form.formState.isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Link
                  href="/dashboard/server"
                  type="button"
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  Cancel
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>View your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p className="text-sm">{currentUser.authUser.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Role</p>
            <p className="text-sm capitalize">{currentUser.profile.role}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Delete Account</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  your account and remove your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount}>
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
