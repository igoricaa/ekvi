# Database Schema Documentation

**Task:** IZA-90 | **Date:** 2025-11-07

Complete Convex database schema for EKVI platform - a knowledge-driven movement education marketplace.

---

## Overview

### Architecture: Hybrid Schema (Better Auth + App Tables)

**Better Auth Tables** (auto-generated):
- `user`, `session`, `account`, `verification`, `twoFactor`, `passkey`
- See [betterAuth/schema.ts](../packages/backend/convex/betterAuth/schema.ts)

**App Tables** (this document):
- 9 core tables covering user profiles, video infrastructure, content structure, and notifications
- See [schema.ts](../packages/backend/convex/schema.ts)

---

## Table Groups

### 1. User Profiles (2 tables)
- `userProfiles` - All user data (athletes, coaches, admins)
- `coachProfiles` - Extended coach-specific information

### 2. Media Infrastructure (2 tables)
- `videos` - Mux video integration with upload tracking
- `files` - Convex Storage integration for images/documents

### 3. Content Structure (4 tables)
- `programs` - Training programs created by coaches
- `programModules` - Modules within programs
- `workouts` - Individual workouts within modules
- `exercises` - Reusable exercise library

### 4. System (1 table)
- `notifications` - User notifications for events

---

## Service Integrations

### Mux Video Platform

**Workflow**: Direct upload with webhook-driven status tracking

```
1. Backend: Create direct upload URL → videos.status = "waiting_for_upload"
2. Frontend: User uploads file
3. Webhook: video.upload.asset_created → status = "processing", set muxAssetId
4. Webhook: video.asset.ready → status = "ready", set muxPlaybackId + metadata
```

**Why store all Mux metadata?**
- Webhooks deliver data automatically (free, no API calls)
- Enables offline queries (filter by duration/status without Mux API)
- Avoids 200ms+ latency per API call
- No rate limit concerns

**Stored metadata**: duration, aspectRatio, thumbnailUrl (all from webhooks)

### Convex Storage

**Workflow**: Upload → Store custom metadata → Query composition

```typescript
// Backend: Upload file and store custom metadata
const storageId = await ctx.storage.generateUploadUrl();
// ... user uploads file ...
await ctx.db.insert("files", {
  storageId,
  fileName: "profile.jpg",
  fileType: "image",
  width: 1920,
  height: 1080,
  mimeType: "image/jpeg", // Duplicate for indexing
});

// Backend: Query with URL generation (single query from frontend)
export const getFileWithUrl = query({
  handler: async (ctx, { fileId }) => {
    const file = await ctx.db.get(fileId);
    const url = await ctx.storage.getUrl(file.storageId); // Generated on-demand

    return {
      ...file,
      url, // Fresh URL, never stale
    };
  },
});
```

**Hybrid Metadata Approach**: Store custom + strategic duplicates, query _storage for rest

---

## Hybrid Metadata Strategy

### The Problem

Convex Storage automatically stores metadata in `_storage` system table:
- `size` (file size in bytes)
- `contentType` (MIME type)
- `_creationTime` (upload timestamp)
- `sha256` (file hash)

**Question**: Should we duplicate this data in our `files` table?

### Three Approaches Compared

#### ❌ Approach 1: Store Everything
```typescript
files: defineTable({
  storageId: v.string(),
  fileName: v.string(),
  fileType: v.string(),
  width: v.number(),
  height: v.number(),
  mimeType: v.string(),    // DUPLICATE
  fileSize: v.number(),    // DUPLICATE
  createdAt: v.number(),   // DUPLICATE
  url: v.string(),         // DUPLICATE (and stale!)
})
```

**Problems**:
- 80% duplication (fileSize, mimeType, createdAt already in _storage)
- Stale URLs (Convex Storage URLs expire)
- 2.7MB wasted for 10K users + 50K files

#### ❌ Approach 2: Store Nothing
```typescript
files: defineTable({
  storageId: v.string(), // Just the reference
})
```

**Problems**:
- No custom metadata (fileName, width, height not in _storage)
- Can't filter by fileType without full table scan
- Two queries needed: files table + _storage lookup

#### ✅ Approach 3: Hybrid (Implemented)
```typescript
files: defineTable({
  storageId: v.string(),        // Reference to _storage

  // Custom metadata (NOT in _storage)
  fileName: v.string(),         // User-friendly name
  fileType: v.string(),         // App categorization
  width: v.optional(v.number()), // Image dimensions
  height: v.optional(v.number()),

  // Strategic duplicate (for indexed filtering)
  mimeType: v.string(),         // Enable fast "show all images" queries

  // NOT STORED (query from _storage when needed):
  // - fileSize: available as storage.size
  // - createdAt: available as storage._creationTime
  // - url: generate via ctx.storage.getUrl(storageId)
})
  .index("by_fileType", ["fileType"])   // Fast filtering
  .index("by_mimeType", ["mimeType"])   // Fast "image/*" queries
```

### Why This Works

**1. Custom metadata stored** (not in _storage):
- `fileName`: "profile-image.jpg" (user-friendly)
- `fileType`: "image" | "thumbnail" | "document" (app categorization)
- `width`, `height`: Image dimensions (not in _storage)

**2. Strategic duplicate**:
- `mimeType`: Duplicate of _storage.contentType
- **Why?** Enables indexed filtering: "show all images" without full table scan
- **Cost**: 20 bytes × 50,000 files = 1MB
- **Benefit**: 50ms vs 5s query time for filtered results

**3. Query from _storage when needed**:
- `fileSize`: Rarely needed (only for "Files > 10MB" admin queries)
- `createdAt`: Rarely needed (only for "Files uploaded this week")
- `url`: Generated on-demand (never stale)

### Performance Analysis

**Common case: Display profile image**

Frontend code:
```typescript
const user = useQuery(api.profiles.getUser, { userId });
// One query, receives everything including fresh URL
```

Backend code (query composition):
```typescript
export const getUser = query({
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db.get(userId);

    if (profile.profileImageId) {
      const file = await ctx.db.get(profile.profileImageId);
      const url = await ctx.storage.getUrl(file.storageId); // Generated on-demand

      return {
        ...profile,
        profileImage: {
          ...file,
          url, // Fresh URL
        },
      };
    }

    return profile;
  },
});
```

**Network Analysis**:
- Frontend → Backend: 1 query (200ms)
- Backend operations (all server-side, no additional network):
  - Query profiles: 5ms
  - Query files: 5ms
  - Generate URL: 10ms
  - Total: 20ms (negligible)
- Backend → Frontend: 1 response (200ms)

**Total: ~400ms** (same as if we stored URL, but URL is always fresh)

**Rare case: Admin query "Show files > 10MB"**
```typescript
// Two queries needed (acceptable for rare admin operation)
const files = await ctx.db.query("files").collect();
const largeFiles = [];

for (const file of files) {
  const storage = await ctx.storage.getMetadata(file.storageId);
  if (storage.size > 10 * 1024 * 1024) {
    largeFiles.push({ ...file, size: storage.size });
  }
}
```

**Cost**: 50ms per file (slow, but admin-only operation)

### Storage Savings

**Avoided duplication**:
```
fileSize (8 bytes) + createdAt (8 bytes) + url (200 bytes avg) = 216 bytes per file

For 50,000 files: 216 × 50,000 = 10.8 MB saved
For 10,000 users with profile images: 216 × 10,000 = 2.16 MB saved

Total saved: ~13 MB for 60K files
```

**Strategic duplication cost**:
```
mimeType (20 bytes avg) × 50,000 files = 1 MB

Net savings: 13 MB - 1 MB = 12 MB
```

---

## Schema Details

### 1. userProfiles

**Purpose**: Extended profile data for all users (separate from auth tables)

**Why separate from auth user table?**
- Auth provider independence (can switch from Better Auth to Clerk/Auth0)
- Clean separation of concerns (auth vs business logic)
- Custom indexes for app queries (by role, location, verification)
- Easier schema extensions (certifications, multi-role support)

**Fields**:
```typescript
{
  authId: string,              // References Better Auth user._id (1:1)
  displayName: string,
  bio?: string,
  profileImage?: Id<"_storage">,  // Convex Storage ID for profile image
  role: "athlete" | "coach" | "admin",
  location?: string,           // City, country for discovery
  languages?: string[],        // e.g., ["en", "sr"]
  verificationStatus: "unverified" | "pending" | "verified",
  certifications?: string[],
  socialLinks?: {
    instagram?: string,
    youtube?: string,
    website?: string,
  },
  createdAt: number,
  updatedAt: number,
}
```

**Indexes**:
- `by_auth` - Join with auth user (most common query)
- `by_role` - Filter coaches/athletes
- `by_location` - Geographic search
- `by_verificationStatus` - Admin queries

**Relationships**:
- `authId` → Better Auth `user._id` (1:1)
- Referenced by: `coachProfiles`, `videos`, `files`, `exercises`, `notifications`

**Profile Image Management:**
- Upload: `generateUploadUrl` → user upload → `updateProfile({ profileImage: storageId })`
- Display: Backend query generates fresh URL via `ctx.storage.getUrl(storageId)`
- Delete: `removeCurrentUserProfileImage` removes from profile and deletes from storage
- Never store URLs directly (they expire)

**Notes**:
- Timezone removed (Serbia/Balkans single timezone)
- Renamed `avatarUrl` → `profileImage` for clarity
- Default `verificationStatus: "unverified"` set in createProfile mutation

### 2. coachProfiles

**Purpose**: Extended coach-specific information (only for users with role="coach")

**Fields**:
```typescript
{
  profileId: Id<"userProfiles">,
  specialties: string[],       // e.g., ["strength", "mobility"]
  dateOfBirth: number,         // For age display
  certifications: string[],
  bio: string,                 // Extended bio (separate from profile.bio)
  introVideoId?: Id<"videos">,
  createdAt: number,
  updatedAt: number,
}
```

**Indexes**:
- `by_profileId` - 1:1 relationship (one coach profile per user)

**Relationships**:
- `profileId` → `userProfiles` (1:1)
- `introVideoId` → `videos` (optional)
- Referenced by: `programs`

**Notes**:
- Removed `yearsExperience`, `hourlyRate`, `availability` (not needed for MVP)
- Added `dateOfBirth` for age display
- `bio` separate from `userProfiles.bio` for extended coach description

### 3. videos

**Purpose**: Mux video integration with upload tracking and status management

**Lifecycle**:
```
1. waiting_for_upload → Create direct upload URL
2. uploading → User uploads file
3. processing → Webhook: video.upload.asset_created
4. ready → Webhook: video.asset.ready (with playback ID + metadata)
5. error → Processing failed
```

**Fields**:
```typescript
{
  uploadedBy: Id<"userProfiles">,
  muxAssetId: string,          // From video.upload.asset_created
  muxUploadId?: string,        // From direct upload creation
  muxPlaybackId?: string,      // From video.asset.ready
  status: "waiting_for_upload" | "uploading" | "processing" | "ready" | "error",
  title: string,
  description?: string,
  duration?: number,           // Seconds (from Mux webhook)
  aspectRatio?: string,        // e.g., "16:9" (from Mux)
  thumbnailUrl?: string,       // Mux auto-generated
  errorMessage?: string,
  createdAt: number,
  updatedAt: number,
}
```

**Indexes**:
- `by_uploadedBy` - User's videos
- `by_status` - Filter by processing status
- `by_muxAssetId` - Webhook lookups
- `by_muxUploadId` - Upload status checks

**Relationships**:
- `uploadedBy` → `userProfiles`
- Referenced by: `coachProfiles.introVideoId`, `programs.previewVideoId`, `workouts.videoId`, `exercises.videoId`

**Mux Webhook Events**:
1. `video.upload.asset_created` - Set `muxAssetId`, status = "processing"
2. `video.asset.ready` - Set `muxPlaybackId`, `duration`, `aspectRatio`, `thumbnailUrl`, status = "ready"
3. `video.asset.errored` - Set `errorMessage`, status = "error"

### 4. files

**Purpose**: Convex Storage integration for images, thumbnails, documents

**Fields**:
```typescript
{
  uploadedBy: Id<"userProfiles">,
  storageId: string,           // Links to Convex _storage system table

  // Custom metadata (NOT in _storage)
  fileName: string,            // User-friendly name
  fileType: string,            // "image" | "thumbnail" | "document"
  width?: number,              // Image dimensions
  height?: number,

  // Strategic duplicate (for indexing)
  mimeType: string,            // Duplicate of _storage.contentType

  // NOT STORED (query from _storage):
  // - fileSize: query _storage.size
  // - createdAt: query _storage._creationTime
  // - url: generate via ctx.storage.getUrl(storageId)
}
```

**Indexes**:
- `by_uploadedBy` - User's files
- `by_storageId` - _storage lookups
- `by_fileType` - Fast filtering by app category
- `by_mimeType` - Fast filtering by MIME type (e.g., "image/*")

**Relationships**:
- `uploadedBy` → `userProfiles`
- `storageId` → Convex `_storage` system table
- Referenced by: `programs.thumbnailId`, `exercises.thumbnailId`

**Query Patterns**:

Display image (common case):
```typescript
export const getFileWithUrl = query({
  handler: async (ctx, { fileId }) => {
    const file = await ctx.db.get(fileId);
    const url = await ctx.storage.getUrl(file.storageId); // Generated on-demand
    return { ...file, url };
  },
});
```

Admin query with size (rare case):
```typescript
export const getLargeFiles = query({
  handler: async (ctx) => {
    const files = await ctx.db.query("files").collect();
    const result = [];

    for (const file of files) {
      const storage = await ctx.storage.getMetadata(file.storageId);
      if (storage.size > 10 * 1024 * 1024) {
        result.push({ ...file, size: storage.size });
      }
    }

    return result;
  },
});
```

### 5. programs

**Purpose**: Training programs/courses created by coaches for marketplace

**Structure**: Program → Modules → Workouts

**Fields**:
```typescript
{
  coachProfileId: Id<"coachProfiles">,
  title: string,
  description: string,
  category: string,            // e.g., "strength", "yoga", "running"
  level: "beginner" | "intermediate" | "advanced",
  thumbnailId?: Id<"files">,
  previewVideoId?: Id<"videos">, // Preview/trailer
  isPublished: boolean,
  createdAt: number,
  updatedAt: number,
}
```

**Indexes**:
- `by_coach` - Coach's programs
- `by_category` - Filter by category
- `by_level` - Filter by difficulty
- `by_published` - Marketplace listing

**Relationships**:
- `coachProfileId` → `coachProfiles`
- `thumbnailId` → `files` (optional)
- `previewVideoId` → `videos` (optional)
- Has many: `programModules`

### 6. programModules

**Purpose**: Modules within programs (structural layer)

**Fields**:
```typescript
{
  programId: Id<"programs">,
  title: string,
  description: string,
  order: number,               // Display order within program
  duration?: number,           // Estimated minutes
  createdAt: number,
  updatedAt: number,
}
```

**Indexes**:
- `by_program` - Program's modules
- `by_program_order` - Ordered queries (compound index)

**Relationships**:
- `programId` → `programs`
- Has many: `workouts`

### 7. workouts

**Purpose**: Individual workouts within modules (contains video + instructions)

**Fields**:
```typescript
{
  moduleId: Id<"programModules">,
  title: string,
  description: string,
  instructions?: string,       // Written instructions
  order: number,               // Display order within module
  videoId?: Id<"videos">,      // Main workout video
  duration?: number,           // Minutes
  difficulty: number,          // 1-5 scale
  createdAt: number,
  updatedAt: number,
}
```

**Indexes**:
- `by_module` - Module's workouts
- `by_module_order` - Ordered queries (compound index)

**Relationships**:
- `moduleId` → `programModules`
- `videoId` → `videos` (optional)

### 8. exercises

**Purpose**: Reusable exercise library (can be used across multiple workouts)

**Fields**:
```typescript
{
  createdBy: Id<"userProfiles">,
  name: string,
  description: string,
  category: string,            // e.g., "strength", "cardio"
  equipment: string[],         // e.g., ["barbell", "bench"]
  videoId?: Id<"videos">,      // Demonstration video
  thumbnailId?: Id<"files">,
  isPublic: boolean,           // Can other coaches use?
  createdAt: number,
  updatedAt: number,
}
```

**Indexes**:
- `by_createdBy` - User's exercises
- `by_category` - Filter by category
- `by_isPublic` - Public exercise library

**Relationships**:
- `createdBy` → `userProfiles`
- `videoId` → `videos` (optional)
- `thumbnailId` → `files` (optional)

**Notes**:
- Removed `muscleGroups` field (not needed for MVP)
- Private exercises visible only to creator
- Public exercises available in shared library

### 9. notifications

**Purpose**: User notifications for system events

**Fields**:
```typescript
{
  userId: Id<"userProfiles">,
  type: string,                // e.g., "video_ready", "program_published"
  title: string,
  content: string,
  actionUrl?: string,          // Where to navigate when clicked
  isRead: boolean,
  readAt?: number,
  metadata?: {
    raw: any,                  // Flexible storage for future extensions
  },
  createdAt: number,
}
```

**Indexes**:
- `by_user_createdAt` - Chronological listing (compound)
- `by_user_isRead` - Filter unread (compound)

**Relationships**:
- `userId` → `userProfiles`

**Common notification types**:
- `video_ready` - Mux video finished processing
- `program_published` - Coach published program
- `new_follower` - Someone followed user
- `verification_approved` - Coach verification approved

---

## Query Patterns

### Pattern 1: Query Composition (Single Frontend Query)

**Use case**: Get user with profile image URL

Frontend:
```typescript
const user = useQuery(api.profiles.getUser, { userId });
// Receives: { ...profile, profileImage: { ...file, url } }
```

Backend:
```typescript
export const getUser = query({
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db.get(userId);

    if (profile.profileImageId) {
      const file = await ctx.db.get(profile.profileImageId);
      const url = await ctx.storage.getUrl(file.storageId);

      return {
        ...profile,
        profileImage: { ...file, url },
      };
    }

    return profile;
  },
});
```

**Why this works**: Backend composes multiple operations into single response

### Pattern 2: Indexed Filtering

**Use case**: Find all published strength programs

```typescript
export const getPublishedPrograms = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("programs")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .filter((q) => q.eq(q.field("isPublished"), true))
      .collect();
  },
});
```

**Why indexes matter**: 50ms with index vs 5s full table scan for 100K programs

### Pattern 3: Compound Index for Ordering

**Use case**: Get modules in order within a program

```typescript
export const getModulesInOrder = query({
  args: { programId: v.id("programs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("programModules")
      .withIndex("by_program_order", (q) =>
        q.eq("programId", args.programId)
      )
      .collect();
  },
});
```

**Why compound index**: Auto-sorted by order field (no manual sorting needed)

### Pattern 4: Reference Lookup

**Use case**: Get program with coach profile

```typescript
export const getProgramWithCoach = query({
  args: { programId: v.id("programs") },
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.programId);
    const coachProfile = await ctx.db.get(program.coachProfileId);
    const userProfile = await ctx.db.get(coachProfile.profileId);

    return {
      ...program,
      coach: {
        ...coachProfile,
        profile: userProfile,
      },
    };
  },
});
```

**Why reference userProfiles**: Auth provider independence + cleaner architecture

---

## Best Practices

### 1. Foreign Keys with Indexes

Always index foreign key fields:
```typescript
coachProfiles: defineTable({
  profileId: v.id("userProfiles"),
}).index("by_profileId", ["profileId"])
```

**Why**: Enables fast joins (5ms vs 500ms)

### 2. Compound Indexes for Ordering

Use compound indexes for ordered queries:
```typescript
programModules: defineTable({
  programId: v.id("programs"),
  order: v.number(),
}).index("by_program_order", ["programId", "order"])
```

**Why**: Auto-sorted results (no manual sorting)

### 3. Status Enums with Indexes

Index status fields for filtering:
```typescript
videos: defineTable({
  status: v.union(
    v.literal("waiting_for_upload"),
    v.literal("processing"),
    v.literal("ready"),
    v.literal("error")
  ),
}).index("by_status", ["status"])
```

**Why**: Fast filtering (e.g., "show all processing videos")

### 4. Query Composition Over Multiple Queries

**❌ Bad**: Multiple frontend queries
```typescript
const profile = useQuery(api.profiles.get, { userId });
const file = useQuery(api.files.get, { fileId: profile?.profileImageId });
const url = useQuery(api.files.getUrl, { fileId });
```

**✅ Good**: Single frontend query with backend composition
```typescript
const user = useQuery(api.profiles.getUser, { userId });
// Backend generates URL and returns everything
```

### 5. Strategic Duplication for Indexing

Duplicate data when it enables indexed filtering:
```typescript
files: defineTable({
  storageId: v.string(),
  mimeType: v.string(), // Duplicate of _storage.contentType
}).index("by_mimeType", ["mimeType"])
```

**Why**: 50ms indexed query vs 5s full table scan

**When NOT to duplicate**: Data rarely queried (fileSize, createdAt)

---

## Future Considerations

### Deferred to Later Phases

**Payments (Phase 2)**:
- `orders` - Purchase records
- `subscriptions` - Recurring payments
- `transactions` - Payment history
- Lemon Squeezy webhook integration

**Communication (TBD)**:
- `conversations` - Chat threads
- `messages` - Individual messages
- Real-time messaging implementation decision pending

**Form Checks (TBD)**:
- Movement assessment feature
- Implementation strategy to be determined

### Potential Optimizations

**Multi-currency support**:
- Current: RSD only (hardcoded)
- Future: Add EUR support with currency field in programs/orders
- Migration: Add `currency: "RSD"` default to existing records

**Multi-role support**:
- Current: Single role per user
- Future: User can be both athlete and coach
- Migration: Change `role` to `roles: string[]`

**Advanced search**:
- Full-text search on program titles/descriptions
- Geographic search with coordinates
- Convex doesn't have full-text search built-in (might need external service)

---

## Migration Notes

### Changes from Initial Setup

**Renamed fields**:
- `userProfiles.avatarUrl` → `userProfiles.profileImage`
  - Migration: `ctx.db.patch(profileId, { profileImage: profile.avatarUrl })`
  - Updated in [profiles.ts:49](../packages/backend/convex/profiles.ts#L49)

**Removed fields**:
- `userProfiles.timezone` - Serbia/Balkans single timezone
  - Migration: No action needed (field simply removed from schema)
  - Updated in [profiles.ts](../packages/backend/convex/profiles.ts)

**Added defaults**:
- `userProfiles.verificationStatus: "unverified"` - Set in createProfile mutation
  - Migration: Existing profiles assumed unverified

**Coach profile changes**:
- Added: `dateOfBirth`
- Removed: `yearsExperience`, `hourlyRate`, `availability`

**Exercise changes**:
- Removed: `muscleGroups`

---

## References

**Schema Definition**: [schema.ts](../packages/backend/convex/schema.ts)
**Profile Functions**: [profiles.ts](../packages/backend/convex/profiles.ts)
**Auth Implementation**: [AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md)
**Auth UI**: [AUTH_UI.md](./AUTH_UI.md)

**External Services**:
- [Mux Documentation](https://docs.mux.com)
- [Convex Storage Guide](https://docs.convex.dev/file-storage)
- [Lemon Squeezy API](https://docs.lemonsqueezy.com)

---

**Last Updated:** 2025-11-07 | **Linear Issue:** IZA-90
