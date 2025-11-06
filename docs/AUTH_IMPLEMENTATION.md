# Better Auth + Convex Implementation

**Task:** IZA-88 | **Date:** 2025-11-06

---

## Architecture

**Decision:** Local Better Auth installation with hybrid schema.

**Why Local (not cloud):**
- Full schema control via `betterAuth/schema.ts`
- Can add custom indexes to auth tables
- Schema changes regenerate with CLI (not automatic)

**Why Hybrid Schema (separate profiles):**
- **Better Auth tables** (`user`, `session`, etc.): Auth-essential fields only
  - `hasCompletedOnboarding` - gates auth flow
  - `accountStatus` - auth-level suspension
- **App table** (`userProfiles`): Business logic fields
  - `displayName`, `bio`, `avatarUrl`, `role`, `location`, `timezone`

**Benefits:**
- Schema stability (no regeneration conflicts for business fields)
- Custom indexes optimized for app queries (by_role, by_location)
- Easy future extensions (certifications table, multi-role, analytics)
- Clean separation (auth vs domain concerns)

---

## Schema

### Better Auth Tables (Auto-Generated)
Located in `packages/backend/convex/betterAuth/schema.ts`:

```typescript
user: {
  _id, email, emailVerified, name, image, createdAt, updatedAt,
  hasCompletedOnboarding,  // Custom: gates onboarding flow
  accountStatus,           // Custom: "active" | "suspended"
}
session: { expiresAt, token, userId, ipAddress, userAgent }
account: { accountId, providerId, userId, accessToken, refreshToken, password }
verification: { identifier, value, expiresAt }
jwks: { publicKey, privateKey, createdAt }
```

### App Schema
Located in `packages/backend/convex/schema.ts`:

```typescript
userProfiles: {
  authId: string,           // References user._id
  displayName: string,
  bio?: string,
  avatarUrl?: string,
  role: "athlete" | "coach" | "admin",
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
│   ├── _generated/          # Auto-generated types
│   ├── auth.ts              # Static auth export for CLI
│   ├── schema.ts            # Auto-generated Better Auth tables
│   ├── adapter.ts           # Database CRUD API
│   └── convex.config.ts     # Component config
├── _generated/              # Convex types
│   └── api.d.ts            # Includes Better Auth component types
├── auth.ts                  # Better Auth config (createAuth, authComponent)
├── auth.config.ts           # Convex auth provider config
├── convex.config.ts         # App config with Better Auth component
├── http.ts                  # HTTP routes for Better Auth
├── schema.ts                # App schema (userProfiles)
├── profiles.ts              # Profile CRUD operations
└── users.ts                 # Auth-only operations (sessions, password)

apps/web/
├── app/
│   ├── (auth)/              # Authenticated routes
│   ├── (unauth)/            # Sign-in, Sign-up pages
│   ├── api/auth/[...all]/   # Better Auth API handler
│   └── layout.tsx           # Root layout with providers
├── lib/
│   ├── auth-client.ts       # Client-side Better Auth
│   └── auth-server.ts       # Server-side token getter
└── components/
    └── providers/
        └── convex-client-provider.tsx  # Convex + Better Auth provider
```

---

## Key Patterns

### Join Auth + Profile
```typescript
// ✅ GOOD - Single query joining both
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

// ❌ BAD - Multiple queries from client
const authUser = useQuery(api.users.getAuthUser);
const profile = useQuery(api.profiles.getProfile, { authId: authUser?._id });
```

### Auth Methods (Null Safety)
```typescript
// Throws if not authenticated - use in protected queries/mutations
const authUser = await authComponent.getAuthUser(ctx);

// Returns null if not authenticated - use for optional auth
const authUser = await authComponent.safeGetAuthUser(ctx);
if (!authUser) return null;

// Returns null if user doesn't exist - use for lookups
const authUser = await authComponent.getAnyUserById(ctx, userId);
if (!authUser) return null;  // User deleted
```

### Update Patterns
```typescript
// ✅ Update Better Auth table
await ctx.runMutation(components.betterAuth.adapter.updateOne, {
  input: {
    model: "user",
    where: [{ field: "_id", value: userId }],
    update: { hasCompletedOnboarding: true, accountStatus: "suspended" },
  },
});

// ✅ Update userProfiles table
await ctx.db.patch(profileId, {
  displayName: "New Name",
  updatedAt: Date.now(),
});
```

### Role-Based Access Control
```typescript
// Helper for role checks
const requireRole = async (ctx, role: "admin" | "coach") => {
  const authUser = await authComponent.getAuthUser(ctx);
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_auth", q => q.eq("authId", authUser._id))
    .first();

  if (!profile || profile.role !== role) {
    throw new Error(`${role} access required`);
  }
  return { authUser, profile };
};

// Usage
export const adminOnlyMutation = mutation({
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    // ... admin logic
  },
});
```

---

## Schema Regeneration

**When to regenerate:** After changing `additionalFields` in `auth.ts`.

```bash
# 1. Navigate to Better Auth directory
cd packages/backend/convex/betterAuth

# 2. Run Better Auth CLI
npx @better-auth/cli generate -y

# 3. Restart Convex dev server (picks up new schema)
cd ../../../
pnpm dev:convex

# 4. Verify types updated
# Check: packages/backend/convex/betterAuth/schema.ts
```

**What gets regenerated:**
- `betterAuth/schema.ts` - All Better Auth tables with your custom fields
- `_generated/api.d.ts` - Type definitions for auth component

**What stays the same:**
- `schema.ts` (userProfiles) - Never touched by Better Auth CLI
- Your app logic in `profiles.ts`, `users.ts`

---

## Environment Setup

### Backend (Convex)
```bash
# Generate and set auth secret
npx convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32)

# Set site URL
npx convex env set SITE_URL=http://localhost:3001
```

### Frontend (.env.local)
```env
# Convex URLs
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-deployment.convex.site

# Local site URL (for Better Auth redirects)
SITE_URL=http://localhost:3001
```

**Important:**
- `CONVEX_SITE_URL` is auto-managed by Convex - DO NOT set manually
- For self-hosted: site URL is typically one port higher (e.g., :3211 vs :3210)

---

## Implementation Notes

### Component Setup (auth.ts)
```typescript
// Import local schema for type safety
import authSchema from "./betterAuth/schema";

// Create client with local schema
export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  { local: { schema: authSchema } }
);
```

### HTTP Routes (http.ts)
```typescript
import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();
authComponent.registerRoutes(http, createAuth);
export default http;
```

### Frontend Provider
```typescript
// Client-side (auth-client.ts)
export const authClient = createAuthClient({
  plugins: [convexClient()],
});

// Provider (convex-client-provider.tsx)
<ConvexBetterAuthProvider client={convex} betterAuth={authClient} expectAuth>
  {children}
</ConvexBetterAuthProvider>
```

### API Routes (Next.js)
```typescript
// app/api/auth/[...all]/route.ts
import { nextJsHandler } from "@convex-dev/better-auth/nextjs";
export const { GET, POST } = nextJsHandler();
```

---

## Common Gotchas

**1. Async without await**
```typescript
// ❌ Unnecessary async
handler: async (ctx) => {
  return authComponent.getAuthUser(ctx);
}

// ✅ Remove async (function already returns Promise)
handler: (ctx) => {
  return authComponent.getAuthUser(ctx);
}
```

**2. Orphaned profiles**
```typescript
// Profile exists but auth user deleted
const authUser = await authComponent.getAnyUserById(ctx, profile.authId);
if (!authUser) return null;  // Handle orphaned profile
```

**3. Onboarding flow**
```
1. Sign up → auth record created (hasCompletedOnboarding: false)
2. Create profile → userProfiles record + set hasCompletedOnboarding: true
3. Access app → check both authUser exists AND profile exists
```

---

**Last Updated:** 2025-11-06
