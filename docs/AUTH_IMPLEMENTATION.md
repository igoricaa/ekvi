# Better Auth + Convex Implementation

**Task:** IZA-88 | **Date:** 2025-11-06

---

## Architecture

### Decision: Local Better Auth + Hybrid Schema

**Local (not cloud):**
- Full schema control via `betterAuth/schema.ts`
- Custom indexes on auth tables
- Schema changes via CLI regeneration

**Hybrid Schema (separate profiles):**
- **Better Auth tables** (`user`, `session`, etc.): Auth-essential fields only
  - `hasCompletedOnboarding` - gates auth flow
  - `accountStatus` - auth-level suspension
- **App table** (`userProfiles`): Business logic fields
  - `displayName`, `bio`, `avatarUrl`, `role`, `location`, `timezone`

**Benefits:**
- Schema stability (no regeneration conflicts)
- Custom app indexes (by_role, by_location)
- Easy extensions (certifications, multi-role, analytics)
- Clean separation of concerns

---

## Schema

### Better Auth Tables
Located in `packages/backend/convex/betterAuth/schema.ts` (auto-generated):

```
user: _id, email, name, hasCompletedOnboarding, accountStatus
session: token, userId, expiresAt, ipAddress, userAgent
account: providerId, userId, accessToken, password
verification: identifier, value, expiresAt
```

### App Schema
Located in `packages/backend/convex/schema.ts`:

```typescript
userProfiles: {
  authId: string,              // References user._id
  displayName: string,
  role: "athlete" | "coach" | "admin",
  bio?: string,
  avatarUrl?: string,
  location?: string,
  timezone?: string,
  createdAt: number,
  updatedAt: number,
}
// Indexes: by_auth, by_role, by_location
```

---

## File Structure

```
packages/backend/convex/
├── betterAuth/               # Local Better Auth component
│   ├── schema.ts            # Auto-generated auth tables
│   ├── adapter.ts           # Database CRUD API
│   └── auth.ts              # Static export for CLI
├── auth.ts                  # Better Auth config (createAuth, component)
├── auth.config.ts           # Convex auth provider config
├── http.ts                  # HTTP routes for Better Auth
├── schema.ts                # App schema (userProfiles)
├── profiles.ts              # Profile CRUD + getCurrentUser
└── users.ts                 # Auth-only operations

apps/web/
├── app/
│   ├── (auth)/              # Protected routes
│   │   ├── onboarding/      # Role selection + profile creation
│   │   ├── settings/        # Profile edit + delete account
│   │   └── dashboard/
│   ├── (unauth)/            # Public auth pages
│   │   ├── sign-in/
│   │   ├── sign-up/
│   │   ├── reset-password/
│   │   └── verify-2fa/
│   └── api/auth/[...all]/   # Better Auth API handler
├── lib/
│   ├── auth-client.ts       # Client-side Better Auth
│   └── validations/auth.ts  # Zod schemas
├── components/providers/
│   └── convex-client-provider.tsx
└── proxy.ts                 # Next.js 16 middleware
```

---

## Key Patterns

### 1. Join Auth + Profile
**✅ Good:** Single query joining both
```typescript
// profiles.ts:7-49
export const getCurrentUser = query({
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_auth", q => q.eq("authId", authUser._id))
      .first();
    return { authUser, profile };
  },
});
```

**❌ Bad:** Multiple queries from client (waterfalls)

### 2. Auth Methods (Null Safety)
```typescript
// Throws if not authenticated - use in protected mutations/queries
await authComponent.getAuthUser(ctx);

// Returns null - use for optional auth
await authComponent.safeGetAuthUser(ctx);

// Returns null if deleted - use for lookups
await authComponent.getAnyUserById(ctx, userId);
```

### 3. Update Patterns
```typescript
// ✅ Better Auth table: Use adapter.updateOne
await ctx.runMutation(components.betterAuth.adapter.updateOne, {
  input: {
    model: "user",
    where: [{ field: "_id", value: userId }],
    update: { hasCompletedOnboarding: true },
  },
});

// ✅ App table: Use ctx.db.patch
await ctx.db.patch(profileId, { displayName: "New Name" });
```

### 4. Role-Based Access Control
Pattern: Create helper function in profiles.ts
```typescript
const requireRole = async (ctx, role: "admin" | "coach") => {
  const { authUser, profile } = await getCurrentUser(ctx);
  if (profile.role !== role) throw new Error("Unauthorized");
  return { authUser, profile };
};
```

---

## Common Gotchas

### 1. Orphaned Profiles
Profile exists but auth user deleted:
```typescript
const authUser = await authComponent.getAnyUserById(ctx, profile.authId);
if (!authUser) return null;  // Handle gracefully
```

### 2. Onboarding Flow
```
1. Sign up → auth record created (hasCompletedOnboarding: false)
2. Onboarding page → create profile + set hasCompletedOnboarding: true
3. Middleware → check session exists
4. App pages → check both auth + profile exist
```

### 3. Delete Account Pattern
**Challenge:** Prevent "Unauthenticated" error during deletion

**Solution:** Skip query when deleting
```typescript
const [isDeleting, setIsDeleting] = useState(false);

const currentUser = useQuery(
  api.profiles.getCurrentUser,
  isDeleting ? "skip" : {}  // Prevents error
);

const handleDelete = async () => {
  setIsDeleting(true);
  await deleteProfile();      // Delete Convex data first
  await authClient.deleteUser();  // Deletes auth + signs out
  window.location.href = "/sign-in";  // Hard redirect
};
```

**Why:** `deleteUser()` invalidates session → query would fail → skip prevents error

### 4. Async Without Await
```typescript
// ❌ Unnecessary async
handler: async (ctx) => authComponent.getAuthUser(ctx)

// ✅ Remove async (already returns Promise)
handler: (ctx) => authComponent.getAuthUser(ctx)
```

---

## Schema Regeneration

**When:** After changing `additionalFields` in auth.ts

```bash
cd packages/backend/convex/betterAuth
npx @better-auth/cli generate -y
cd ../../../
pnpm dev:convex  # Restart to pick up changes
```

**What regenerates:**
- `betterAuth/schema.ts` - All auth tables with custom fields
- `_generated/api.d.ts` - Type definitions

**What stays same:**
- `schema.ts` (userProfiles)
- Your app logic (profiles.ts, users.ts)

---

## OAuth Setup (Google)

### Backend
See `auth.ts:socialProviders` - enables Google if env vars set

### Environment Variables
```bash
# Backend
npx convex env set GOOGLE_CLIENT_ID your-id
npx convex env set GOOGLE_CLIENT_SECRET your-secret

# Frontend .env.local
GOOGLE_CLIENT_ID=your-id
GOOGLE_CLIENT_SECRET=your-secret
```

### Frontend Usage
```typescript
await authClient.signIn.social({ provider: "google" });
```

Callback handled automatically at `/api/auth/callback/google`

---

## Environment Setup

### Backend (Convex)
```bash
npx convex env set BETTER_AUTH_SECRET $(openssl rand -base64 32)
npx convex env set SITE_URL http://localhost:3001
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-deployment.convex.site
SITE_URL=http://localhost:3001
```

**Important:** `CONVEX_SITE_URL` auto-managed by Convex - don't set manually

---

## Implementation References

### Component Setup
- Config: `auth.ts` - createAuth with local schema
- Routes: `http.ts` - authComponent.registerRoutes
- Provider: `convex-client-provider.tsx` - ConvexBetterAuthProvider

### Key Functions
- Join auth+profile: `profiles.ts:getCurrentUser`
- Create profile: `profiles.ts:createProfile` (sets hasCompletedOnboarding)
- Update profile: `profiles.ts:updateProfile`
- Delete flow: See settings/page.tsx with query skip pattern

---

**Last Updated:** 2025-11-06
