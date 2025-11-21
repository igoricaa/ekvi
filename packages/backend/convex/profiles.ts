import { v } from "convex/values";
import { components } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

/**
 * Get Current User Profile (Helper)
 *
 * Retrieves authenticated user's profile in one operation.
 * For use in queries and mutations only (direct ctx.db access).
 *
 * For actions, use ctx.runQuery(api.profiles.getCurrentUser) instead.
 *
 * @throws Error if profile not found (user hasn't completed onboarding)
 * @returns Object containing authUser and profile
 */
export async function getCurrentUserProfile(ctx: QueryCtx | MutationCtx) {
  const authUser = await authComponent.getAuthUser(ctx);

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_auth", (q) => q.eq("authId", authUser._id))
    .first();

  if (!profile) {
    throw new Error("Profile not found - complete onboarding first");
  }

  return { authUser, profile };
}

// Get full user (auth + profile)
export const getCurrentUser = query({
  args: { needImageUrl: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);

    if (!authUser) {
      return null;
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_auth", (q) => q.eq("authId", authUser._id))
      .first();

    if (!profile) {
      // User authenticated but hasn't completed onboarding
      return {
        authUser: {
          _id: authUser._id,
          email: authUser.email,
          name: authUser.name,
          emailVerified: authUser.emailVerified,
          hasCompletedOnboarding: authUser.hasCompletedOnboarding,
        },
        profile: null,
      };
    }

    const needUrl = args.needImageUrl ?? true;
    const profileImageUrl =
      needUrl && profile.profileImage
        ? await ctx.storage.getUrl(profile.profileImage)
        : null;

    return {
      authUser: {
        _id: authUser._id,
        email: authUser.email,
        name: authUser.name,
        emailVerified: authUser.emailVerified,
        hasCompletedOnboarding: authUser.hasCompletedOnboarding,
      },
      profile: {
        _id: profile._id,
        displayName: profile.displayName,
        bio: profile.bio,
        profileImage: profileImageUrl,
        role: profile.role,
        location: profile.location,
      },
    };
  },
});

// Create profile after signup (onboarding)
export const createProfile = mutation({
  args: {
    displayName: v.string(),
    role: v.union(v.literal("athlete"), v.literal("coach"), v.literal("admin")),
    bio: v.optional(v.string()),
    profileImage: v.optional(v.id("_storage")),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);

    // Check if profile already exists
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_auth", (q) => q.eq("authId", authUser._id))
      .first();

    if (existing) {
      throw new Error("Profile already exists");
    }

    const now = Date.now();
    const profileId = await ctx.db.insert("userProfiles", {
      authId: authUser._id,
      displayName: args.displayName,
      bio: args.bio,
      profileImage: args.profileImage,
      role: args.role,
      location: args.location,
      verificationStatus: "unverified", // Default status for new profiles
      createdAt: now,
      updatedAt: now,
    });

    // Mark onboarding as complete
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: authUser._id }],
        update: { hasCompletedOnboarding: true },
      },
    });

    return profileId;
  },
});

// Generate upload URL for Profile images
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);

    // Verify user is authenticated
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

// Update profile
export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    profileImage: v.optional(v.id("_storage")),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_auth", (q) => q.eq("authId", authUser._id))
      .first();

    if (!profile) {
      throw new Error("Profile not found - complete onboarding first");
    }

    await ctx.db.patch(profile._id, {
      ...args,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get user by profile ID (for public profiles)
export const getUserByProfileId = query({
  args: { profileId: v.id("userProfiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);

    if (!profile) {
      return null;
    }

    const authUser = await authComponent.getAnyUserById(ctx, profile.authId);

    if (!authUser) {
      return null; // Profile orphaned - auth user no longer exists
    }

    return {
      profile,
      authUser: {
        name: authUser.name,
        email: authUser.email, // Consider hiding in production
      },
    };
  },
});

export const deleteCurrentUserProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_auth", (q) => q.eq("authId", authUser._id))
      .first();

    if (profile) {
      await ctx.db.delete(profile._id);
    }

    return { success: true };
  },
});

export const removeCurrentUserProfileImage = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_auth", (q) => q.eq("authId", authUser._id))
      .first();

    if (!profile) {
      throw new Error("Profile not found - complete onboarding first");
    }

    if (!profile.profileImage) {
      throw new Error("Profile image not found");
    }

    await ctx.db.patch(profile._id, { profileImage: undefined });
    await ctx.storage.delete(profile.profileImage);

    return { success: true };
  },
});

// List users by role (e.g., all coaches)
export const getUsersByRole = query({
  args: {
    role: v.union(v.literal("athlete"), v.literal("coach"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const profiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .collect();

    return profiles;
  },
});
