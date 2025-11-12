import { describe, expect, it } from "vitest";
import { api, components } from "../_generated/api";
import { setupConvexTest } from "../test.setup";
import { createAuthenticatedTestUser } from "./helpers";

/**
 * Comprehensive Auth & Profile Tests
 *
 * Tests the authentication and profile management functionality of EKVI platform.
 * Covers:
 * - User profile creation and onboarding
 * - Profile queries and retrieval
 * - Profile updates
 * - Authorization checks
 * - Admin-only operations
 * - Edge cases and error scenarios
 *
 * Testing Strategy:
 * - Use describe() blocks for organization
 * - Test both success and failure paths
 * - Verify authorization enforcement
 * - Check database state changes
 * - Use convexTest for isolated test environments
 */

describe("Profile Management", () => {
  describe("Profile Creation", () => {
    it("should create a new user profile", async () => {
      const t = setupConvexTest();

      // Create a mock auth user and session (simulating Better Auth)
      // CRITICAL: Must use component.adapter.create to insert into component tables
      const { authUserId, sessionId } = await t.run(async (ctx) => {
        const now = Date.now();

        // Create user in Better Auth component's user table
        const user = await ctx.runMutation(
          components.betterAuth.adapter.create,
          {
            input: {
              model: "user",
              data: {
                email: "athlete@example.com",
                name: "Test Athlete",
                emailVerified: false,
                createdAt: now,
                updatedAt: now,
                hasCompletedOnboarding: false,
                accountStatus: "active",
              },
            },
          }
        );

        // Create session for the user in Better Auth component's session table
        const session = await ctx.runMutation(
          components.betterAuth.adapter.create,
          {
            input: {
              model: "session",
              data: {
                userId: user._id, // Extract _id from user object
                token: `test-token-${user._id}-${now}`,
                expiresAt: now + 86_400_000, // 24 hours
                createdAt: now,
                updatedAt: now,
              },
            },
          }
        );

        return { authUserId: user._id, sessionId: session._id };
      });

      // Create profile as authenticated user with proper identity format
      // CRITICAL: Must include sessionId for Better Auth to work
      const asUser = t.withIdentity({
        subject: authUserId,
        sessionId,
        tokenIdentifier: `${authUserId}|${sessionId}`,
      });

      const profileId = await asUser.mutation(api.profiles.createProfile, {
        displayName: "Test Athlete",
        role: "athlete",
        bio: "Passionate about fitness",
        location: "New York, USA",
      });

      expect(profileId).toBeDefined();

      // Verify profile was created correctly
      const profile = await t.run(async (ctx) => {
        return await ctx.db.get(profileId);
      });

      expect(profile).toMatchObject({
        authId: authUserId,
        displayName: "Test Athlete",
        role: "athlete",
        bio: "Passionate about fitness",
        location: "New York, USA",
        verificationStatus: "unverified",
      });
      expect(profile?.createdAt).toBeDefined();
      expect(profile?.updatedAt).toBeDefined();

      // Verify onboarding flag was updated
      // CRITICAL: Must query component database, not main database
      const authUser = await t.run(async (ctx) => {
        return await ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "user",
          where: [{ field: "_id", value: authUserId }],
        });
      });

      expect(authUser?.hasCompletedOnboarding).toBe(true);
    });

    it("should prevent creating duplicate profiles", async () => {
      const t = setupConvexTest();
      const { asUser } = await createAuthenticatedTestUser(t, {
        email: "duplicate@example.com",
        name: "Duplicate User",
      });

      // Create first profile (should succeed)
      await asUser.mutation(api.profiles.createProfile, {
        displayName: "First Profile",
        role: "athlete",
      });

      // Attempt to create second profile (should fail)
      await expect(async () => {
        await asUser.mutation(api.profiles.createProfile, {
          displayName: "Second Profile",
          role: "coach",
        });
      }).rejects.toThrowError("Profile already exists");
    });

    it("should create coach profile with all fields", async () => {
      const t = setupConvexTest();
      const { asUser: asCoach } = await createAuthenticatedTestUser(t, {
        email: "coach@example.com",
        name: "Test Coach",
      });

      const profileId = await asCoach.mutation(api.profiles.createProfile, {
        displayName: "Elite Coach",
        role: "coach",
        bio: "10 years of coaching experience",
        location: "Los Angeles, USA",
      });

      const profile = await t.run(async (ctx) => {
        return await ctx.db.get(profileId);
      });

      expect(profile?.role).toBe("coach");
      expect(profile?.bio).toBe("10 years of coaching experience");
    });
  });

  describe("Profile Queries", () => {
    it("should get current user profile", async () => {
      const t = setupConvexTest();
      const { asUser, userId: authUserId } = await createAuthenticatedTestUser(
        t,
        {
          email: "user@example.com",
          name: "Test User",
          hasCompletedOnboarding: true,
        }
      );

      const profileId = await t.run(async (ctx) => {
        return await ctx.db.insert("userProfiles", {
          authId: authUserId,
          displayName: "Test User Profile",
          role: "athlete",
          verificationStatus: "unverified",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Query current user
      const result = await asUser.query(api.profiles.getCurrentUser, {
        needImageUrl: false,
      });

      expect(result).toMatchObject({
        authUser: {
          _id: authUserId,
          email: "user@example.com",
          name: "Test User",
          hasCompletedOnboarding: true,
        },
        profile: {
          _id: profileId,
          displayName: "Test User Profile",
          role: "athlete",
          profileImage: null,
        },
      });
    });

    it("should return null profile if user hasn't completed onboarding", async () => {
      const t = setupConvexTest();
      const { asUser: asNewUser } = await createAuthenticatedTestUser(t, {
        email: "new@example.com",
        name: "New User",
        hasCompletedOnboarding: false,
      });

      const result = await asNewUser.query(api.profiles.getCurrentUser, {});

      expect(result.profile).toBeNull();
      expect(result.authUser).toMatchObject({
        email: "new@example.com",
        hasCompletedOnboarding: false,
      });
    });

    it("should get user by profile ID (public profile)", async () => {
      const t = setupConvexTest();
      const { userId: authUserId } = await createAuthenticatedTestUser(t, {
        email: "public@example.com",
        name: "Public User",
        hasCompletedOnboarding: true,
      });

      const profileId = await t.run(async (ctx) => {
        return await ctx.db.insert("userProfiles", {
          authId: authUserId,
          displayName: "Public Coach",
          role: "coach",
          verificationStatus: "verified",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Query as different user (or anonymous)
      const result = await t.query(api.profiles.getUserByProfileId, {
        profileId,
      });

      expect(result).toMatchObject({
        profile: {
          _id: profileId,
          displayName: "Public Coach",
          role: "coach",
        },
        authUser: {
          name: "Public User",
          email: "public@example.com",
        },
      });
    });

    it("should list users by role", async () => {
      const t = setupConvexTest();

      // Create multiple users with different roles
      const { userId: authId1 } = await createAuthenticatedTestUser(t, {
        email: "coach1@example.com",
        name: "Coach 1",
        hasCompletedOnboarding: true,
      });

      const coachId1 = await t.run(async (ctx) => {
        return await ctx.db.insert("userProfiles", {
          authId: authId1,
          displayName: "Coach One",
          role: "coach",
          verificationStatus: "verified",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const { userId: authId2 } = await createAuthenticatedTestUser(t, {
        email: "coach2@example.com",
        name: "Coach 2",
        hasCompletedOnboarding: true,
      });

      const coachId2 = await t.run(async (ctx) => {
        return await ctx.db.insert("userProfiles", {
          authId: authId2,
          displayName: "Coach Two",
          role: "coach",
          verificationStatus: "verified",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const { userId: authId3 } = await createAuthenticatedTestUser(t, {
        email: "athlete@example.com",
        name: "Athlete",
        hasCompletedOnboarding: true,
      });

      await t.run(async (ctx) => {
        return await ctx.db.insert("userProfiles", {
          authId: authId3,
          displayName: "Athlete User",
          role: "athlete",
          verificationStatus: "unverified",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Query all coaches
      const coaches = await t.query(api.profiles.getUsersByRole, {
        role: "coach",
      });

      expect(coaches).toHaveLength(2);
      expect(coaches.map((c) => c._id)).toContain(coachId1);
      expect(coaches.map((c) => c._id)).toContain(coachId2);
    });
  });

  describe("Profile Updates", () => {
    it("should update user profile", async () => {
      const t = setupConvexTest();
      const { asUser, userId: authUserId } = await createAuthenticatedTestUser(
        t,
        {
          email: "updateuser@example.com",
          name: "Update User",
          hasCompletedOnboarding: true,
        }
      );

      const now = Date.now();
      const profileId = await t.run(async (ctx) => {
        return await ctx.db.insert("userProfiles", {
          authId: authUserId,
          displayName: "Original Name",
          role: "athlete",
          bio: "Original bio",
          verificationStatus: "unverified",
          createdAt: now,
          updatedAt: now,
        });
      });

      // Wait 1ms to ensure updatedAt will be different
      await new Promise((resolve) => setTimeout(resolve, 1));

      // Update profile
      const result = await asUser.mutation(api.profiles.updateProfile, {
        displayName: "Updated Name",
        bio: "Updated bio with new information",
        location: "San Francisco, USA",
      });

      expect(result.success).toBe(true);

      // Verify updates
      const updatedProfile = await t.run(async (ctx) => {
        return await ctx.db.get(profileId);
      });

      expect(updatedProfile).toMatchObject({
        displayName: "Updated Name",
        bio: "Updated bio with new information",
        location: "San Francisco, USA",
      });
      expect(updatedProfile?.updatedAt).toBeGreaterThan(
        updatedProfile?.createdAt ?? 0
      );
    });

    it("should fail to update profile if not authenticated", async () => {
      const t = setupConvexTest();

      await expect(async () => {
        await t.mutation(api.profiles.updateProfile, {
          displayName: "Hacker Name",
        });
      }).rejects.toThrow();
    });

    it("should delete current user profile", async () => {
      const t = setupConvexTest();
      const { asUser, userId: authUserId } = await createAuthenticatedTestUser(
        t,
        {
          email: "delete@example.com",
          name: "Delete User",
          hasCompletedOnboarding: true,
        }
      );

      const profileId = await t.run(async (ctx) => {
        return await ctx.db.insert("userProfiles", {
          authId: authUserId,
          displayName: "To Be Deleted",
          role: "athlete",
          verificationStatus: "unverified",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Delete profile
      const result = await asUser.mutation(
        api.profiles.deleteCurrentUserProfile
      );
      expect(result.success).toBe(true);

      // Verify deletion
      const deletedProfile = await t.run(async (ctx) => {
        return await ctx.db.get(profileId);
      });

      expect(deletedProfile).toBeNull();
    });
  });

  describe("Authorization & Security", () => {
    it("should generate upload URL for authenticated user", async () => {
      const t = setupConvexTest();
      const { asUser } = await createAuthenticatedTestUser(t, {
        email: "uploader@example.com",
        name: "Uploader",
        hasCompletedOnboarding: true,
      });

      const uploadUrl = await asUser.mutation(api.profiles.generateUploadUrl);

      expect(uploadUrl).toBeDefined();
      expect(typeof uploadUrl).toBe("string");
    });

    it("should prevent unauthorized users from generating upload URLs", async () => {
      const t = setupConvexTest();

      await expect(async () => {
        await t.mutation(api.profiles.generateUploadUrl);
      }).rejects.toThrow();
    });
  });
});

describe("Admin Operations", () => {
  describe("Account Suspension", () => {
    it("should allow admin to suspend accounts", async () => {
      const t = setupConvexTest();

      // Create admin user
      const { asUser: asAdmin, userId: adminAuthId } =
        await createAuthenticatedTestUser(t, {
          email: "admin@example.com",
          name: "Admin User",
          hasCompletedOnboarding: true,
        });

      await t.run(async (ctx) => {
        return await ctx.db.insert("userProfiles", {
          authId: adminAuthId,
          displayName: "Admin",
          role: "admin",
          verificationStatus: "verified",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create target user to suspend
      const { userId: targetUserId } = await createAuthenticatedTestUser(t, {
        email: "target@example.com",
        name: "Target User",
        hasCompletedOnboarding: true,
      });

      // Suspend account
      await asAdmin.mutation(api.users.suspendAccount, {
        userId: targetUserId,
      });

      // Verify suspension - must query component database
      const suspendedUser = await t.run(async (ctx) => {
        return await ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "user",
          where: [{ field: "_id", value: targetUserId }],
        });
      });

      expect(suspendedUser?.accountStatus).toBe("suspended");
    });

    it("should prevent non-admin from suspending accounts", async () => {
      const t = setupConvexTest();

      // Create regular user (athlete)
      const { asUser, userId: userAuthId } = await createAuthenticatedTestUser(
        t,
        {
          email: "athlete@example.com",
          name: "Regular User",
          hasCompletedOnboarding: true,
        }
      );

      await t.run(async (ctx) => {
        return await ctx.db.insert("userProfiles", {
          authId: userAuthId,
          displayName: "Athlete",
          role: "athlete",
          verificationStatus: "unverified",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create target user
      const { userId: targetUserId } = await createAuthenticatedTestUser(t, {
        email: "target2@example.com",
        name: "Target User 2",
        hasCompletedOnboarding: true,
      });

      // Attempt to suspend (should fail)
      await expect(async () => {
        await asUser.mutation(api.users.suspendAccount, {
          userId: targetUserId,
        });
      }).rejects.toThrowError("Admin access required");
    });

    it("should prevent coach from suspending accounts", async () => {
      const t = setupConvexTest();

      // Create coach user
      const { asUser: asCoach, userId: coachAuthId } =
        await createAuthenticatedTestUser(t, {
          email: "coach@example.com",
          name: "Coach User",
          hasCompletedOnboarding: true,
        });

      await t.run(async (ctx) => {
        return await ctx.db.insert("userProfiles", {
          authId: coachAuthId,
          displayName: "Coach",
          role: "coach",
          verificationStatus: "verified",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const { userId: targetUserId } = await createAuthenticatedTestUser(t, {
        email: "target3@example.com",
        name: "Target User 3",
        hasCompletedOnboarding: true,
      });

      // Attempt to suspend (should fail)
      await expect(async () => {
        await asCoach.mutation(api.users.suspendAccount, {
          userId: targetUserId,
        });
      }).rejects.toThrowError("Admin access required");
    });
  });
});

describe("Edge Cases & Error Handling", () => {
  it("should handle profile updates with partial fields", async () => {
    const t = setupConvexTest();
    const { asUser, userId: authUserId } = await createAuthenticatedTestUser(
      t,
      {
        email: "partial@example.com",
        name: "Partial User",
        hasCompletedOnboarding: true,
      }
    );

    await t.run(async (ctx) => {
      return await ctx.db.insert("userProfiles", {
        authId: authUserId,
        displayName: "Original",
        role: "athlete",
        bio: "Original bio",
        location: "Original location",
        verificationStatus: "unverified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Update only bio
    await asUser.mutation(api.profiles.updateProfile, {
      bio: "Updated bio only",
    });

    const profile = await asUser.query(api.profiles.getCurrentUser, {
      needImageUrl: false,
    });

    expect(profile.profile?.bio).toBe("Updated bio only");
    expect(profile.profile?.displayName).toBe("Original");
    expect(profile.profile?.location).toBe("Original location");
  });

  it("should return null for non-existent profile by ID", async () => {
    const t = setupConvexTest();

    // Create a profile and then delete it to test non-existent ID handling
    const { userId } = await createAuthenticatedTestUser(t, {
      email: "temp@example.com",
      name: "Temp User",
    });

    const profileId = await t.run(async (ctx) => {
      return await ctx.db.insert("userProfiles", {
        authId: userId,
        displayName: "Temp",
        role: "athlete",
        verificationStatus: "unverified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Delete the profile so the ID is valid but points to nothing
    await t.run(async (ctx) => {
      await ctx.db.delete(profileId);
    });

    // Query with deleted profile ID - should return null
    const result = await t.query(api.profiles.getUserByProfileId, {
      profileId,
    });

    expect(result).toBeNull();
  });

  it("should handle deletion of profile without image", async () => {
    const t = setupConvexTest();
    const { asUser, userId: authUserId } = await createAuthenticatedTestUser(
      t,
      {
        email: "noimage@example.com",
        name: "No Image User",
        hasCompletedOnboarding: true,
      }
    );

    await t.run(async (ctx) => {
      return await ctx.db.insert("userProfiles", {
        authId: authUserId,
        displayName: "No Image",
        role: "athlete",
        verificationStatus: "unverified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Should not throw when removing non-existent image
    await expect(async () => {
      await asUser.mutation(api.profiles.removeCurrentUserProfileImage);
    }).rejects.toThrowError("Profile image not found");
  });
});
