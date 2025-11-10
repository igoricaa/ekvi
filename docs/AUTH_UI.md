# Authentication UI Implementation

**Task:** IZA-89 | **Date:** 2025-11-06

Complete authentication user interface with form validation, OAuth, and full user flow from signup to profile management.

---

## Architecture Decisions

### Form Validation: React Hook Form + Zod

**Decision:** Use React Hook Form with Zod validation and shadcn Form components.

**Why:**
- **Type Safety**: Zod schemas provide runtime validation + TypeScript types
- **Accessibility**: shadcn Form handles ARIA labels, error announcements
- **Developer Experience**: Single source of truth for validation rules
- **Performance**: React Hook Form minimizes re-renders
- **Consistency**: All forms follow the same pattern

**Trade-offs:** More boilerplate, but better UX and fewer bugs

### Middleware: Next.js 16 Proxy Pattern

**Decision:** Use `proxy.ts` for route protection (Next.js 16 standard).

**Why:**
- **Session Check**: Better Auth provides `getSessionCookie()` helper
- **Smart Redirects**: Redirect to onboarding (not dashboard) for post-auth
- **Public Routes**: Allow unauthenticated access to auth pages

### Delete Account: Cascade + Skip Query

**Decision:** Manual cascade delete with query skipping during deletion.

**Why:**
- Better Auth doesn't auto-delete related data
- **Query skip** prevents "Unauthenticated" errors during deletion
- User sees smooth loading → success toast → redirect (no error flash)

---

## Pages Overview

### Route Groups

**Unauth Group:** `app/(unauth)/`
- Sign-in, sign-up, password reset, 2FA
- Accessible without authentication
- Centered card layout

**Auth Group:** `app/(auth)/`
- Onboarding, settings, dashboard
- Requires session cookie
- Full app layout with navigation

### Page Responsibilities

| Page | Purpose | Key Redirects |
|------|---------|---------------|
| **sign-up** | Registration + Google OAuth | → sign-in (after signup) |
| **sign-in** | Login with password/Google | → onboarding (if no profile)<br>→ verify-2fa (if 2FA enabled) |
| **reset-password** | Reset password with token | → sign-in (after reset) |
| **verify-2fa** | Verify 2FA code | → / (after verification) |
| **onboarding** | Select role + create profile | → dashboard (after completion) |
| **settings** | Edit profile + delete account | Requires completed profile |
| **dashboard** | Main app content | Requires auth + profile |

---

## Form Validation

### Zod Schemas

**Location:** `apps/web/lib/validations/auth.ts`

**Pattern:** One schema per form, export schema + inferred type.

**All Schemas:**
- `signUpSchema` - Registration with password confirmation, optional image
- `signInSchema` - Email/password login
- `passwordResetRequestSchema` - Request reset (email only)
- `passwordResetSchema` - Reset with new password + confirmation
- `twoFactorSchema` - 6-digit numeric code
- `profileUpdateSchema` - Edit profile fields
- `onboardingSchema` - Role selection + initial profile

**Example Pattern:**
```typescript
// In validations/auth.ts
export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  passwordConfirmation: z.string(),
}).refine(data => data.password === data.passwordConfirmation, {
  message: "Passwords do not match",
  path: ["passwordConfirmation"],
});

export type SignUpFormValues = z.infer<typeof signUpSchema>;
```

### Form Component Pattern

See any auth form (e.g., `sign-up.tsx`) for complete implementation:
1. `useForm` with `zodResolver`
2. shadcn `<Form>` wrapper
3. `<FormField>` for each input with auto-wired errors
4. Better Auth callbacks (onRequest, onSuccess, onError)

---

## Routing & Middleware

### Middleware Logic

**File:** `apps/web/proxy.ts`

**Flow:**
1. Public routes (`/sign-in`, `/sign-up`, etc.) → allow if no session
2. Authenticated routes → require session cookie
3. Root `/` → redirect to `/onboarding` if authenticated
4. Onboarding checks profile → redirects to dashboard if complete

**Key Decision:** Redirect to `/onboarding` (not `/dashboard`) after login
- Onboarding page checks if profile exists
- Creates profile if needed, or redirects to dashboard
- Handles both new users and existing users gracefully

---

## OAuth Implementation

### Google OAuth

**Backend:** `packages/backend/convex/auth.ts`
```typescript
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    enabled: !!process.env.GOOGLE_CLIENT_ID,
  },
}
```

**Frontend Usage:**
```typescript
await authClient.signIn.social({ provider: "google" });
```

**Environment Variables:**
```bash
# Backend
npx convex env set GOOGLE_CLIENT_ID your-id
npx convex env set GOOGLE_CLIENT_SECRET your-secret

# Frontend .env.local
GOOGLE_CLIENT_ID=your-id
GOOGLE_CLIENT_SECRET=your-secret
```

**Flow:**
1. User clicks "Sign in with Google"
2. Redirected to Google consent screen
3. Better Auth handles callback at `/api/auth/callback/google`
4. Session created → redirect to onboarding
5. Onboarding checks profile → creates if needed → dashboard

---

## Onboarding Flow

### Implementation

**File:** `apps/web/app/(auth)/onboarding/page.tsx`

**Flow:**
1. Query `getCurrentUser` to check if profile exists
2. If profile exists → redirect to dashboard immediately
3. Show role selection cards (Athlete vs Coach)
4. After role selection → show profile form
5. Pre-fill `displayName` from auth user's name
6. Create profile with `createProfile` mutation
   - Sets `hasCompletedOnboarding: true` in auth table
   - Inserts record in `userProfiles` table
7. Redirect to dashboard

**Why Two-Step UI:**
- Clear visual choice for role (reduces cognitive load)
- Can add role-specific fields later
- Better UX than dropdown

---

## Delete Account Implementation

### Complete Flow

**File:** `apps/web/app/(auth)/settings/page.tsx`

**Challenge:** Prevent "Unauthenticated" error page flash during deletion

**Solution:** Skip query when deleting

```typescript
const [isDeleting, setIsDeleting] = useState(false);

// Skip query to prevent error after user deleted
const currentUser = useQuery(
  api.profiles.getCurrentUser,
  isDeleting ? "skip" : {}
);

const handleDeleteAccount = async () => {
  try {
    setIsDeleting(true);

    // 1. Delete Convex profile
    await deleteCurrentUserProfile();

    // 2. Delete auth user (also signs out)
    await authClient.deleteUser();

    // 3. Show success + hard redirect
    toast.success("Account deleted successfully");
    setTimeout(() => {
      window.location.href = "/sign-in";  // Hard redirect
    }, 300);
  } catch {
    setIsDeleting(false);
    toast.error("Failed to delete account");
  }
};

// Show loading overlay during deletion
if (isDeleting) {
  return <LoadingScreen message="Deleting account..." />;
}
```

**Backend:** `packages/backend/convex/profiles.ts:deleteCurrentUserProfile`

**Why This Works:**
1. `setIsDeleting(true)` → query skipped (no auth check)
2. Profile deleted from Convex
3. User deleted from Better Auth (session invalidated)
4. Loading screen shown (smooth UX)
5. `window.location.href` = hard redirect (bypasses Next.js cache)
6. No error page flash

**Common Mistakes:**
```typescript
// ❌ Don't use router.push (cache issues)
router.push("/sign-in");

// ❌ Don't call signOut after deleteUser (already signed out)
await authClient.deleteUser();
await authClient.signOut(); // Error: session not found

// ✅ Use window.location.href
window.location.href = "/sign-in";
```

---

## Profile Image Upload & Removal

### Implementation

**File:** `apps/web/app/(auth)/settings/page.tsx`

**Flow:**
1. User clicks Image → DropdownMenu opens
2. Select "Promeni fotografiju" → File input triggers
3. User selects image → Preview dialog opens
4. Show preview in large Image (size-64)
5. Confirm → Upload to Convex Storage → Update profile → Success toast
6. Or Cancel → Clear selection and close dialog

**Components Used:**
- Next.js Image (circular display with fallback div)
- DropdownMenu (upload/remove options)
- Dialog (preview before upload)
- AlertDialog (confirm deletion)
- File input (type="file", accept="image/*")

**Key Features:**
- Circular avatar with edit icon overlay
- Preview before upload (prevents accidental uploads)
- Confirm before delete (prevents accidental removal)
- Loading states during upload
- Toast notifications for success/error

### Architecture Decisions

**Decision:** Preview dialog before upload instead of immediate upload on file select

**Why:**
- Better UX - user sees what they're uploading
- Prevents accidental uploads from file picker errors
- Allows cancellation before committing storage space
- Standard pattern in modern apps (Twitter, LinkedIn, etc.)

**Trade-offs:** One extra click, but significantly better UX

**Decision:** DropdownMenu instead of Popover for edit options

**Why:**
- Better semantic match (menu of actions vs floating content)
- Built-in keyboard navigation
- Better mobile touch targets
- Consistent with shadcn patterns

**Decision:** EditIcon positioned outside Image/fallback container

**Why:**
- Clean separation of concerns (image vs overlay decoration)
- Absolute positioning allows independent styling
- Works with both Image and fallback div states
- Easier to maintain and modify overlay styling

### Backend Functions

**File:** `packages/backend/convex/profiles.ts`

**Functions Used:**
- `generateUploadUrl` - Create Convex Storage upload URL
- `updateProfile` - Update profile with new storageId
- `removeCurrentUserProfileImage` - Remove image and delete from storage
- `getCurrentUser` - Fetch profile with image URL (needImageUrl: true)

**Upload Flow:**
```typescript
// 1. Generate upload URL
const uploadUrl = await generateUploadUrl();

// 2. Upload file to Convex Storage
const result = await fetch(uploadUrl, {
  method: "POST",
  headers: { "Content-Type": file.type },
  body: file,
});

const { storageId } = await result.json();

// 3. Update profile with storageId
await updateProfile({ profileImage: storageId });
```

**Delete Flow:**
```typescript
// Remove from profile and delete from storage
await removeCurrentUserProfileImage();
// Backend deletes old image from storage automatically
```

### Common Patterns

**Profile Image with Edit Overlay:**
```typescript
<div className="relative inline-block">
  {imageUrl ? (
    <Image
      src={imageUrl}
      alt="Profile Image"
      width={160}
      height={160}
      className="object-cover rounded-full cursor-pointer size-40"
    />
  ) : (
    <div className="size-40 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
      {initials}
    </div>
  )}

  {/* Edit icon overlay */}
  <div className="absolute bottom-2 right-2 rounded-full bg-background p-1.5 shadow-md border">
    <EditIcon size={16} />
  </div>
</div>
```

**Preview with Confirm/Cancel:**
```typescript
<Dialog open={isPreviewOpen}>
  <DialogContent>
    <Image
      src={preview}
      alt="Preview"
      width={256}
      height={256}
      className="object-cover rounded-full size-64"
    />
    <DialogFooter>
      <Button variant="outline" onClick={cancel}>Cancel</Button>
      <Button onClick={confirm} disabled={uploading}>
        {uploading ? <Loader2 /> : "Confirm"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Common UI Patterns

### Loading States
Pattern used in all auth forms:
```typescript
const [loading, setLoading] = useState(false);

await authClient.signUp.email(data, {
  onRequest: () => setLoading(true),
  onSuccess: () => {
    setLoading(false);
    router.push("/sign-in");
  },
  onError: (ctx) => {
    setLoading(false);
    toast.error(ctx.error.message);
  },
});

<Button disabled={loading}>
  {loading ? <Loader2 className="animate-spin" /> : "Sign Up"}
</Button>
```

### Password Confirmation
Zod refine pattern:
```typescript
.refine(data => data.password === data.passwordConfirmation, {
  message: "Passwords do not match",
  path: ["passwordConfirmation"],  // Error shows on confirmation field
});
```

### Forgot Password
In sign-in form:
```typescript
const handleResetPassword = async () => {
  const email = form.getValues("email");
  if (!email) {
    toast.error("Please enter your email address");
    return;
  }

  await authClient.forgetPassword({
    email,
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });

  toast.success("Check your email for the reset link!");
};
```

---


## Environment Variables

### Frontend (.env.local)
```env
# Required
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# OAuth (Optional)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Backend (Convex)
```bash
npx convex env set SITE_URL http://localhost:3001
npx convex env set BETTER_AUTH_SECRET $(openssl rand -base64 32)
npx convex env set GOOGLE_CLIENT_ID your-id
npx convex env set GOOGLE_CLIENT_SECRET your-secret
```

---

## File Structure Summary

```
app/
├── (unauth)/                     # Public auth pages
│   ├── sign-up/
│   │   ├── page.tsx             # Layout wrapper
│   │   └── sign-up.tsx          # Form component
│   ├── sign-in/
│   ├── reset-password/
│   └── verify-2fa/
├── (auth)/                       # Protected pages
│   ├── onboarding/
│   ├── settings/
│   └── dashboard/
└── api/auth/[...all]/route.ts   # Better Auth API

lib/
├── auth-client.ts                # Better Auth client config
├── auth-server.ts                # Server-side token getter
└── validations/auth.ts           # All Zod schemas

components/
├── providers/
│   └── convex-client-provider.tsx
└── ui/                           # shadcn components
    ├── form.tsx
    ├── input.tsx
    └── ...

proxy.ts                          # Next.js 16 middleware
```

---

**Last Updated:** 2025-11-06
