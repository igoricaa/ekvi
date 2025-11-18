import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { getCurrentUserProfile } from "./profiles";

// Get auth user only (minimal data)
export const getAuthUser = query({
  args: {},
  handler: (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});

// Password management
export const updateUserPassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.changePassword({
      body: {
        currentPassword: args.currentPassword,
        newPassword: args.newPassword,
      },
      headers,
    });
  },
});

// Session management
export const listSessions = query({
  args: {},
  handler: async (ctx) => {
    const _user = await authComponent.getAuthUser(ctx);
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    return auth.api.listSessions({ headers });
  },
});

export const revokeSession = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.revokeSession({
      body: { token: args.sessionToken },
      headers,
    });
  },
});

// Account suspension (admin only)
export const suspendAccount = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Check admin (via profile)
    const { profile: adminProfile } = await getCurrentUserProfile(ctx);

    if (adminProfile.role !== "admin") {
      throw new Error("Admin access required");
    }

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: args.userId }],
        update: { accountStatus: "suspended" },
      },
    });
  },
});
