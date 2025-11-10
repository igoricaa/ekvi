import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * EKVI Database Schema
 *
 * Complete database schema for the EKVI platform - a knowledge-driven
 * movement education marketplace connecting coaches with athletes.
 *
 * Architecture:
 * - Auth tables managed by Better Auth component (user, session, account, etc.)
 * - App tables defined here for business logic
 * - Relationships via v.id("tableName") with indexed foreign keys
 * - Timestamps in milliseconds since epoch
 */

export default defineSchema({
  // ============================================================================
  // BETTER AUTH TABLES (Auto-created by component)
  // ============================================================================
  // The Better Auth component automatically creates these tables:
  // - user: Auth user with custom fields (hasCompletedOnboarding, accountStatus)
  // - session: User sessions
  // - account: OAuth accounts
  // - verification: Email verification
  // - twoFactor: 2FA settings
  // - passkey: Passkey auth

  // ============================================================================
  // 1. USER PROFILES
  // ============================================================================

  /**
   * User Profiles
   *
   * Extended profile data separate from auth (Better Auth) tables.
   * All users (athletes, coaches, admins) have a profile after onboarding.
   *
   * Relationships:
   * - authId → Better Auth user._id (1:1)
   * - Coaches also have coachProfiles entry (1:1 optional)
   */
  userProfiles: defineTable({
    authId: v.string(), // References Better Auth user._id

    // Core profile
    displayName: v.string(),
    bio: v.optional(v.string()),
    profileImage: v.optional(v.id("_storage")), // Convex storage ID for profile image

    // Business logic
    role: v.union(v.literal("athlete"), v.literal("coach"), v.literal("admin")),

    // Location & language
    location: v.optional(v.string()), // City, country for coach discovery
    languages: v.optional(v.array(v.string())), // Spoken languages (e.g., ["en", "sr"])

    // Verification & credentials
    verificationStatus: v.union(
      v.literal("unverified"),
      v.literal("pending"),
      v.literal("verified")
    ),
    certifications: v.optional(v.array(v.string())), // Professional certifications

    // Social links
    socialLinks: v.optional(
      v.object({
        instagram: v.optional(v.string()),
        youtube: v.optional(v.string()),
        website: v.optional(v.string()),
      })
    ),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auth", ["authId"])
    .index("by_role", ["role"])
    .index("by_location", ["location"])
    .index("by_verificationStatus", ["verificationStatus"]),

  // ============================================================================
  // 2. COACH-SPECIFIC DATA
  // ============================================================================

  /**
   * Coach Profiles
   *
   * Extended coach-specific information. Created when a user with role="coach"
   * completes their coach onboarding flow.
   *
   * Relationships:
   * - profileId → userProfiles (1:1)
   * - introVideoId → videos (optional)
   */
  coachProfiles: defineTable({
    profileId: v.id("userProfiles"), // Link to user profile

    // Professional info
    specialties: v.array(v.string()), // e.g., ["strength", "mobility", "yoga"]
    dateOfBirth: v.number(), // Timestamp (for age display)
    certifications: v.array(v.string()), // Professional certifications
    bio: v.string(), // Extended coach bio (separate from profile.bio)

    // Media
    introVideoId: v.optional(v.id("videos")), // Coach intro video

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_profileId", ["profileId"]), // Unique - one coach profile per user

  // ============================================================================
  // 3. VIDEO INFRASTRUCTURE (MUX)
  // ============================================================================

  /**
   * Videos (Mux Integration)
   *
   * Tracks video uploads and processing via Mux.
   *
   * Lifecycle:
   * 1. Create direct upload URL → status: "waiting_for_upload"
   * 2. User uploads → status: "uploading"
   * 3. Webhook: video.upload.asset_created → status: "processing", set muxAssetId
   * 4. Webhook: video.asset.ready → status: "ready", set muxPlaybackId, duration, etc.
   *
   * Relationships:
   * - uploadedBy → userProfiles
   * - Referenced by: programs (preview), coachProfiles (intro), workouts, exercises
   */
  videos: defineTable({
    uploadedBy: v.id("userProfiles"),

    // Mux IDs
    muxAssetId: v.string(), // Mux asset ID (from webhook)
    muxUploadId: v.optional(v.string()), // Mux upload ID (from direct upload creation)
    muxPlaybackId: v.optional(v.string()), // Mux playback ID (from video.asset.ready)

    // Status tracking
    status: v.union(
      v.literal("waiting_for_upload"), // Upload URL created, awaiting file
      v.literal("uploading"), // File being uploaded
      v.literal("processing"), // Mux processing video
      v.literal("ready"), // Ready for playback
      v.literal("error") // Processing failed
    ),

    // Metadata
    title: v.string(),
    description: v.optional(v.string()),

    // Video properties (from Mux webhooks)
    duration: v.optional(v.number()), // Duration in seconds
    aspectRatio: v.optional(v.string()), // e.g., "16:9"
    thumbnailUrl: v.optional(v.string()), // Mux auto-generated thumbnail

    // Error handling
    errorMessage: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_uploadedBy", ["uploadedBy"])
    .index("by_status", ["status"])
    .index("by_muxAssetId", ["muxAssetId"]) // For webhook lookups
    .index("by_muxUploadId", ["muxUploadId"]), // For upload status checks

  // ============================================================================
  // 4. FILE STORAGE (CONVEX STORAGE)
  // ============================================================================

  /**
   * Files (Convex Storage)
   *
   * Metadata for files stored in Convex storage (images, thumbnails, documents).
   *
   * Design: Hybrid approach - store custom metadata + strategic duplicates
   * - Custom: fileName, fileType, width, height (not in Convex _storage)
   * - Strategic duplicate: mimeType (for fast filtering/indexing)
   * - Query from _storage: fileSize, createdAt, url (via ctx.storage.getUrl)
   *
   * Rationale:
   * - Convex _storage already stores: size, contentType, _creationTime
   * - We duplicate mimeType for indexed queries ("show all images")
   * - Generate url on-demand (ctx.storage.getUrl) - avoids stale URLs
   * - Query fileSize/createdAt from _storage when needed (rare case)
   *
   * Relationships:
   * - uploadedBy → userProfiles
   * - storageId → Convex _storage system table
   * - Referenced by: programs (thumbnail), exercises (thumbnail)
   */
  files: defineTable({
    uploadedBy: v.id("userProfiles"),

    // Storage reference
    storageId: v.id("_storage"), // Links to Convex _storage system table

    // Custom metadata (not in Convex _storage)
    fileName: v.string(), // User-friendly file name
    fileType: v.string(), // App categorization: "image", "thumbnail", "document"

    // Image dimensions (not in Convex _storage)
    width: v.optional(v.number()), // Image width in pixels
    height: v.optional(v.number()), // Image height in pixels

    // Strategic duplicate (for indexing)
    mimeType: v.string(), // Duplicate of Convex contentType - enables fast filtering

    // NOT STORED (query from _storage system table when needed):
    // - fileSize: available as storage.size
    // - createdAt: available as storage._creationTime
    // - url: generate via ctx.storage.getUrl(storageId)
  })
    .index("by_uploadedBy", ["uploadedBy"])
    .index("by_storageId", ["storageId"]) // For _storage lookups
    .index("by_fileType", ["fileType"]) // Fast filtering by app category
    .index("by_mimeType", ["mimeType"]), // Fast filtering by mime type (e.g., "image/*")

  // ============================================================================
  // 5. PROGRAMS & CONTENT STRUCTURE
  // ============================================================================

  /**
   * Programs
   *
   * Training programs/courses created by coaches. Can be published to marketplace.
   *
   * Structure: Program → Modules → Workouts
   *
   * Relationships:
   * - coachProfileId → coachProfiles
   * - thumbnailId → files (optional)
   * - previewVideoId → videos (optional)
   * - Has many: programModules
   */
  programs: defineTable({
    coachProfileId: v.id("coachProfiles"),

    // Content
    title: v.string(),
    description: v.string(),

    // Classification
    category: v.string(), // e.g., "strength", "yoga", "running", "mobility"
    level: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced")
    ),

    // Media
    thumbnailId: v.optional(v.id("files")),
    previewVideoId: v.optional(v.id("videos")), // Preview/trailer video

    // Publishing
    isPublished: v.boolean(),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_coach", ["coachProfileId"])
    .index("by_category", ["category"])
    .index("by_level", ["level"])
    .index("by_published", ["isPublished"]),

  /**
   * Program Modules
   *
   * Modules within programs. Provides structure: Program → Module → Workout.
   *
   * Relationships:
   * - programId → programs
   * - Has many: workouts
   */
  programModules: defineTable({
    programId: v.id("programs"),

    // Content
    title: v.string(),
    description: v.string(),

    // Ordering
    order: v.number(), // Display order within program

    // Metadata
    duration: v.optional(v.number()), // Estimated duration in minutes

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_program", ["programId"])
    .index("by_program_order", ["programId", "order"]), // Compound index for ordered queries

  /**
   * Workouts
   *
   * Individual workouts within modules. Contains video and instructions.
   *
   * Relationships:
   * - moduleId → programModules
   * - videoId → videos (optional)
   */
  workouts: defineTable({
    moduleId: v.id("programModules"),

    // Content
    title: v.string(),
    description: v.string(),
    instructions: v.optional(v.string()), // Written instructions

    // Ordering
    order: v.number(), // Display order within module

    // Media
    videoId: v.optional(v.id("videos")), // Main workout video

    // Metadata
    duration: v.optional(v.number()), // Duration in minutes
    difficulty: v.number(), // 1-5 scale

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_module", ["moduleId"])
    .index("by_module_order", ["moduleId", "order"]), // Compound index for ordered queries

  /**
   * Exercises
   *
   * Reusable exercise library. Exercises can be used across multiple workouts.
   * Coaches can create private exercises or make them public for others to use.
   *
   * Relationships:
   * - createdBy → userProfiles
   * - videoId → videos (optional)
   * - thumbnailId → files (optional)
   */
  exercises: defineTable({
    createdBy: v.id("userProfiles"),

    // Content
    name: v.string(),
    description: v.string(),

    // Classification
    category: v.string(), // e.g., "strength", "cardio", "flexibility"
    equipment: v.array(v.string()), // e.g., ["barbell", "bench"]

    // Media
    videoId: v.optional(v.id("videos")), // Demonstration video
    thumbnailId: v.optional(v.id("files")),

    // Sharing
    isPublic: v.boolean(), // Can other coaches use this exercise?

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_createdBy", ["createdBy"])
    .index("by_category", ["category"])
    .index("by_isPublic", ["isPublic"]),

  // ============================================================================
  // 6. NOTIFICATIONS
  // ============================================================================

  /**
   * Notifications
   *
   * User notifications for various events (video ready, program published, etc.).
   *
   * Relationships:
   * - userId → userProfiles
   */
  notifications: defineTable({
    userId: v.id("userProfiles"),

    // Content
    type: v.string(), // e.g., "video_ready", "program_published"
    title: v.string(),
    content: v.string(),

    // Action
    actionUrl: v.optional(v.string()), // Where to navigate when clicked

    // Status
    isRead: v.boolean(),
    readAt: v.optional(v.number()),

    // Metadata (flexible for future extensibility)
    metadata: v.optional(
      v.object({
        raw: v.any(), // Store any additional notification data
      })
    ),

    // Timestamp
    createdAt: v.number(),
  })
    .index("by_user_createdAt", ["userId", "createdAt"]) // For chronological listing
    .index("by_user_isRead", ["userId", "isRead"]), // For filtering unread
});
