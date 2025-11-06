import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Better Auth component auto-creates auth tables:
  // - user (with our custom fields: hasCompletedOnboarding, accountStatus)
  // - session
  // - account
  // - verification
  // - twoFactor
  // - passkey

  // App-specific tables for business logic
  userProfiles: defineTable({
    authId: v.string(), // References Better Auth user._id

    // Core profile
    displayName: v.string(),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),

    // Business logic
    role: v.union(v.literal("athlete"), v.literal("coach"), v.literal("admin")),

    // Location (for coach marketplace)
    location: v.optional(v.string()),
    timezone: v.optional(v.string()),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auth", ["authId"])
    .index("by_role", ["role"])
    .index("by_location", ["location"]),
});
