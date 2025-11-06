import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// Get full user (auth + profile)
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // TODO: proveri šta authUser vraća kada ne postoji authUser, da li vraća null
    const authUser = await authComponent.getAuthUser(ctx);

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
          hasCompletedOnboarding: authUser.hasCompletedOnboarding,
        },
        profile: null,
      };
    }

    return {
      authUser: {
        _id: authUser._id,
        email: authUser.email,
        name: authUser.name,
        hasCompletedOnboarding: authUser.hasCompletedOnboarding,
      },
      profile: {
        _id: profile._id,
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        role: profile.role,
        location: profile.location,
        timezone: profile.timezone,
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
    avatarUrl: v.optional(v.string()),
    location: v.optional(v.string()),
    timezone: v.optional(v.string()),
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
      avatarUrl: args.avatarUrl,
      role: args.role,
      location: args.location,
      timezone: args.timezone,
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

// Generate upload URL for avatar images
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
    avatarUrl: v.optional(v.string()),
    location: v.optional(v.string()),
    timezone: v.optional(v.string()),
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
