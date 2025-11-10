import { z } from "zod";

// Sign up validation schema
export const signUpSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .min(2, "First name must be at least 2 characters")
      .max(50, "First name must be less than 50 characters"),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .min(2, "Last name must be at least 2 characters")
      .max(50, "Last name must be less than 50 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    passwordConfirmation: z.string().min(1, "Please confirm your password"),
    image: z
      .instanceof(File)
      .optional()
      .refine(
        (file) => !file || file.size <= 5 * 1024 * 1024,
        "Image must be less than 5MB"
      )
      .refine(
        (file) => !file || file.type.startsWith("image/"),
        "File must be an image"
      ),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords do not match",
    path: ["passwordConfirmation"],
  });

export type SignUpFormValues = z.infer<typeof signUpSchema>;

// Sign in validation schema
export const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignInFormValues = z.infer<typeof signInSchema>;

// Password reset request schema
export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

export type PasswordResetRequestFormValues = z.infer<
  typeof passwordResetRequestSchema
>;

// Password reset schema
export const passwordResetSchema = z
  .object({
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    passwordConfirmation: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords do not match",
    path: ["passwordConfirmation"],
  });

export type PasswordResetFormValues = z.infer<typeof passwordResetSchema>;

// 2FA verification schema
export const twoFactorSchema = z.object({
  code: z
    .string()
    .min(6, "Verification code must be 6 digits")
    .max(6, "Verification code must be 6 digits")
    .regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

export type TwoFactorFormValues = z.infer<typeof twoFactorSchema>;

// Profile update schema
export const profileUpdateSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be less than 50 characters"),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  location: z
    .string()
    .max(100, "Location must be less than 100 characters")
    .optional(),
});

export type ProfileUpdateFormValues = z.infer<typeof profileUpdateSchema>;

export const uploadImageSchema = z.object({
  image: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: "Image must be less than 5MB",
    })
    .refine((file) => file.type.startsWith("image/"), {
      message: "File must be an image",
    }),
});

export type UploadImageFormValues = z.infer<typeof uploadImageSchema>;

// Onboarding schema
export const onboardingSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be less than 50 characters"),
  role: z.enum(["athlete", "coach"]).refine((val) => val !== undefined, {
    message: "Please select a role",
  }),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  location: z
    .string()
    .max(100, "Location must be less than 100 characters")
    .optional(),
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;
