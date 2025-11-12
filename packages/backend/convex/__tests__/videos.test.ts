import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import { setupConvexTest } from "../test.setup";
import { createAuthenticatedTestUser } from "./helpers";

/**
 * Video Management Tests
 *
 * Comprehensive tests for Mux video integration covering:
 * - Video creation (direct upload URL generation)
 * - Video metadata updates
 * - Video deletion (with Mux cleanup)
 * - Video listing and filtering
 * - Authorization checks
 * - Abandoned upload cleanup (cron job)
 * - Edge cases and error scenarios
 *
 * Architecture:
 * - Videos are uploaded directly to Mux via direct upload URLs
 * - Convex tracks video metadata and status
 * - Webhooks update video status (waiting → uploading → processing → ready)
 * - Users can only manage their own videos
 *
 * Testing Strategy:
 * - No MSW needed (Mux actions tested separately, mutations/queries only here)
 * - Test database state changes and authorization
 * - Verify ownership enforcement
 * - Test edge cases (abandoned uploads, invalid data)
 */

describe("Video Operations", () => {
  describe("Video Creation", () => {
    it("should create video with direct upload URL", async () => {
      const t = setupConvexTest();
      const { asUser } = await createAuthenticatedTestUser(t, {
        email: "coach@example.com",
        name: "Coach Test",
      });

      // Create profile first (required for video uploads)
      const profileId = await asUser.mutation(api.profiles.createProfile, {
        displayName: "Coach Test",
        role: "coach",
      });

      // Insert video manually (simulating what createDirectUpload action does)
      const videoId = await t.run(async (ctx) => {
        return await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profileId,
          muxUploadId: "test-upload-id-123",
          title: "Training Session 1",
          description: "Warm-up exercises",
          status: "waiting_for_upload",
        });
      });

      expect(videoId).toBeDefined();

      // Verify video was created correctly
      const video = await t.run(async (ctx) => {
        return await ctx.db.get(videoId);
      });

      expect(video).toMatchObject({
        uploadedBy: profileId,
        muxUploadId: "test-upload-id-123",
        title: "Training Session 1",
        description: "Warm-up exercises",
        status: "waiting_for_upload",
        muxAssetId: "", // Empty until webhook sets it
      });
      expect(video?.createdAt).toBeDefined();
      expect(video?.updatedAt).toBeDefined();
    });

    it("should create video without description", async () => {
      const t = setupConvexTest();
      const { asUser } = await createAuthenticatedTestUser(t, {
        email: "coach2@example.com",
        name: "Coach Two",
      });

      const profileId = await asUser.mutation(api.profiles.createProfile, {
        displayName: "Coach Two",
        role: "coach",
      });

      const videoId = await t.run(async (ctx) => {
        return await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profileId,
          muxUploadId: "test-upload-id-456",
          title: "Quick Tutorial",
          status: "waiting_for_upload",
        });
      });

      const video = await t.run(async (ctx) => {
        return await ctx.db.get(videoId);
      });

      expect(video?.title).toBe("Quick Tutorial");
      expect(video?.description).toBeUndefined();
    });

    it("should track multiple statuses in video lifecycle", async () => {
      const t = setupConvexTest();
      const { asUser } = await createAuthenticatedTestUser(t, {
        email: "uploader@example.com",
        name: "Test Uploader",
      });

      const profileId = await asUser.mutation(api.profiles.createProfile, {
        displayName: "Test Uploader",
        role: "coach",
      });

      // Create video in "waiting_for_upload" status
      const videoId = await t.run(async (ctx) => {
        return await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profileId,
          muxUploadId: "upload-lifecycle-test",
          title: "Lifecycle Test Video",
          status: "waiting_for_upload",
        });
      });

      // Simulate webhook updating status to "processing"
      await t.run(async (ctx) => {
        await ctx.db.patch(videoId, {
          status: "processing",
          muxAssetId: "asset-123",
        });
      });

      let video = await t.run(async (ctx) => {
        return await ctx.db.get(videoId);
      });
      expect(video?.status).toBe("processing");
      expect(video?.muxAssetId).toBe("asset-123");

      // Simulate webhook updating status to "ready"
      await t.run(async (ctx) => {
        await ctx.db.patch(videoId, {
          status: "ready",
          muxPlaybackId: "playback-456",
          duration: 120.5,
          aspectRatio: "16:9",
        });
      });

      video = await t.run(async (ctx) => {
        return await ctx.db.get(videoId);
      });
      expect(video?.status).toBe("ready");
      expect(video?.muxPlaybackId).toBe("playback-456");
      expect(video?.duration).toBe(120.5);
      expect(video?.aspectRatio).toBe("16:9");
    });
  });

  describe("Video Metadata Updates", () => {
    it("should update video title and description", async () => {
      const t = setupConvexTest();
      const { asUser } = await createAuthenticatedTestUser(t, {
        email: "editor@example.com",
        name: "Video Editor",
      });

      const profileId = await asUser.mutation(api.profiles.createProfile, {
        displayName: "Video Editor",
        role: "coach",
      });

      // Create video
      const videoId = await t.run(async (ctx) => {
        return await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profileId,
          muxUploadId: "edit-test-upload",
          title: "Original Title",
          description: "Original description",
          status: "ready",
        });
      });

      const originalVideo = await t.run(async (ctx) => {
        return await ctx.db.get(videoId);
      });
      const originalUpdatedAt = originalVideo?.updatedAt;

      // Wait 1ms to ensure updatedAt changes
      await new Promise((resolve) => setTimeout(resolve, 1));

      // Update video metadata
      await asUser.mutation(api.mux.mutations.updateVideoMetadata, {
        videoId,
        title: "Updated Title",
        description: "Updated description with new content",
      });

      // Verify updates
      const updatedVideo = await t.run(async (ctx) => {
        return await ctx.db.get(videoId);
      });

      expect(updatedVideo?.title).toBe("Updated Title");
      expect(updatedVideo?.description).toBe(
        "Updated description with new content"
      );
      expect(updatedVideo?.updatedAt).toBeGreaterThan(originalUpdatedAt ?? 0);
    });

    it("should update only title (partial update)", async () => {
      const t = setupConvexTest();
      const { asUser } = await createAuthenticatedTestUser(t, {
        email: "partial@example.com",
        name: "Partial Updater",
      });

      const profileId = await asUser.mutation(api.profiles.createProfile, {
        displayName: "Partial Updater",
        role: "coach",
      });

      const videoId = await t.run(async (ctx) => {
        return await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profileId,
          muxUploadId: "partial-update-test",
          title: "Original Title",
          description: "Original Description",
          status: "ready",
        });
      });

      // Update only title
      await asUser.mutation(api.mux.mutations.updateVideoMetadata, {
        videoId,
        title: "New Title Only",
      });

      const video = await t.run(async (ctx) => {
        return await ctx.db.get(videoId);
      });

      expect(video?.title).toBe("New Title Only");
      expect(video?.description).toBe("Original Description"); // Unchanged
    });

    it("should update only description (partial update)", async () => {
      const t = setupConvexTest();
      const { asUser } = await createAuthenticatedTestUser(t, {
        email: "desc-updater@example.com",
        name: "Description Updater",
      });

      const profileId = await asUser.mutation(api.profiles.createProfile, {
        displayName: "Description Updater",
        role: "coach",
      });

      const videoId = await t.run(async (ctx) => {
        return await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profileId,
          muxUploadId: "desc-update-test",
          title: "Keep This Title",
          description: "Old description",
          status: "ready",
        });
      });

      // Update only description
      await asUser.mutation(api.mux.mutations.updateVideoMetadata, {
        videoId,
        description: "Brand new description",
      });

      const video = await t.run(async (ctx) => {
        return await ctx.db.get(videoId);
      });

      expect(video?.title).toBe("Keep This Title"); // Unchanged
      expect(video?.description).toBe("Brand new description");
    });

    it("should prevent unauthorized users from updating videos", async () => {
      const t = setupConvexTest();

      // Create video owner
      const { asUser: owner } = await createAuthenticatedTestUser(t, {
        email: "owner@example.com",
        name: "Video Owner",
      });

      const ownerProfileId = await owner.mutation(api.profiles.createProfile, {
        displayName: "Video Owner",
        role: "coach",
      });

      const videoId = await t.run(async (ctx) => {
        return await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: ownerProfileId,
          muxUploadId: "auth-test-video",
          title: "Owner's Video",
          status: "ready",
        });
      });

      // Create different user (attacker)
      const { asUser: attacker } = await createAuthenticatedTestUser(t, {
        email: "attacker@example.com",
        name: "Attacker",
      });

      await attacker.mutation(api.profiles.createProfile, {
        displayName: "Attacker",
        role: "coach",
      });

      // Attempt to update someone else's video
      await expect(
        attacker.mutation(api.mux.mutations.updateVideoMetadata, {
          videoId,
          title: "Hacked Title",
        })
      ).rejects.toThrow("Unauthorized");
    });

    it("should fail to update non-existent video", async () => {
      const t = setupConvexTest();
      const { asUser } = await createAuthenticatedTestUser(t, {
        email: "ghost@example.com",
        name: "Ghost User",
      });

      await asUser.mutation(api.profiles.createProfile, {
        displayName: "Ghost User",
        role: "coach",
      });

      // Create a video, then delete it to get a valid but non-existent ID
      const { userId: authId } = await createAuthenticatedTestUser(t, {
        email: "temp@example.com",
        name: "Temp",
        hasCompletedOnboarding: true,
      });

      const profileId = await t.run(async (ctx) => {
        return await ctx.db.insert("userProfiles", {
          authId,
          displayName: "Temp",
          role: "coach",
          verificationStatus: "unverified",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const deletedVideoId = await t.run(async (ctx) => {
        const id = await ctx.db.insert("videos", {
          uploadedBy: profileId,
          muxUploadId: "deleted-video",
          muxAssetId: "",
          title: "Deleted",
          status: "ready",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.delete(id);
        return id;
      });

      await expect(
        asUser.mutation(api.mux.mutations.updateVideoMetadata, {
          videoId: deletedVideoId,
          title: "Ghost Title",
        })
      ).rejects.toThrow("Video not found");
    });
  });

  describe("Video Deletion", () => {
    it("should delete video from database", async () => {
      const t = setupConvexTest();
      const { asUser } = await createAuthenticatedTestUser(t, {
        email: "deleter@example.com",
        name: "Video Deleter",
      });

      const profileId = await asUser.mutation(api.profiles.createProfile, {
        displayName: "Video Deleter",
        role: "coach",
      });

      const videoId = await t.run(async (ctx) => {
        return await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profileId,
          muxUploadId: "delete-test",
          title: "Video to Delete",
          status: "ready",
        });
      });

      // Set muxAssetId (normally set by webhook)
      await t.run(async (ctx) => {
        await ctx.db.patch(videoId, {
          muxAssetId: "asset-to-delete-123",
        });
      });

      // Delete video
      const result = await asUser.mutation(api.mux.mutations.deleteVideo, {
        videoId,
      });

      expect(result.success).toBe(true);

      // Verify video is deleted from database
      const deletedVideo = await t.run(async (ctx) => {
        return await ctx.db.get(videoId);
      });

      expect(deletedVideo).toBeNull();
    });

    it("should prevent unauthorized users from deleting videos", async () => {
      const t = setupConvexTest();

      // Create video owner
      const { asUser: owner } = await createAuthenticatedTestUser(t, {
        email: "video-owner@example.com",
        name: "Video Owner",
      });

      const ownerProfileId = await owner.mutation(api.profiles.createProfile, {
        displayName: "Video Owner",
        role: "coach",
      });

      const videoId = await t.run(async (ctx) => {
        return await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: ownerProfileId,
          muxUploadId: "protected-video",
          title: "Protected Video",
          status: "ready",
        });
      });

      // Create different user
      const { asUser: otherUser } = await createAuthenticatedTestUser(t, {
        email: "other@example.com",
        name: "Other User",
      });

      await otherUser.mutation(api.profiles.createProfile, {
        displayName: "Other User",
        role: "coach",
      });

      // Attempt to delete someone else's video
      await expect(
        otherUser.mutation(api.mux.mutations.deleteVideo, {
          videoId,
        })
      ).rejects.toThrow("Unauthorized");

      // Verify video still exists
      const video = await t.run(async (ctx) => {
        return await ctx.db.get(videoId);
      });
      expect(video).not.toBeNull();
    });

    it("should fail to delete non-existent video", async () => {
      const t = setupConvexTest();
      const { asUser } = await createAuthenticatedTestUser(t, {
        email: "deleter2@example.com",
        name: "Deleter Two",
      });

      await asUser.mutation(api.profiles.createProfile, {
        displayName: "Deleter Two",
        role: "coach",
      });

      // Create and immediately delete a video to get valid ID
      const { userId: authId } = await createAuthenticatedTestUser(t, {
        email: "temp2@example.com",
        name: "Temp2",
        hasCompletedOnboarding: true,
      });

      const profileId = await t.run(async (ctx) => {
        return await ctx.db.insert("userProfiles", {
          authId,
          displayName: "Temp2",
          role: "coach",
          verificationStatus: "unverified",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const nonExistentVideoId = await t.run(async (ctx) => {
        const id = await ctx.db.insert("videos", {
          uploadedBy: profileId,
          muxUploadId: "temp-video",
          muxAssetId: "",
          title: "Temp",
          status: "ready",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.delete(id);
        return id;
      });

      await expect(
        asUser.mutation(api.mux.mutations.deleteVideo, {
          videoId: nonExistentVideoId,
        })
      ).rejects.toThrow("Video not found");
    });
  });

  describe("Video Listing and Filtering", () => {
    it("should list user's videos (excluding incomplete)", async () => {
      const t = setupConvexTest();
      const { asUser } = await createAuthenticatedTestUser(t, {
        email: "lister@example.com",
        name: "Video Lister",
      });

      const profileId = await asUser.mutation(api.profiles.createProfile, {
        displayName: "Video Lister",
        role: "coach",
      });

      // Create multiple videos with different statuses
      await t.run(async (ctx) => {
        await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profileId,
          muxUploadId: "upload-1",
          title: "Ready Video 1",
          status: "ready",
        });

        await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profileId,
          muxUploadId: "upload-2",
          title: "Ready Video 2",
          status: "ready",
        });

        await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profileId,
          muxUploadId: "upload-3",
          title: "Processing Video",
          status: "processing",
        });

        // These should be excluded by default
        await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profileId,
          muxUploadId: "upload-4",
          title: "Waiting Video",
          status: "waiting_for_upload",
        });

        await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profileId,
          muxUploadId: "upload-5",
          title: "Uploading Video",
          status: "uploading",
        });
      });

      // List videos (should exclude waiting_for_upload and uploading)
      const videos = await asUser.query(api.mux.queries.listUserVideos, {});

      expect(videos).toHaveLength(3); // ready + ready + processing
      expect(videos.map((v) => v.title)).toContain("Ready Video 1");
      expect(videos.map((v) => v.title)).toContain("Ready Video 2");
      expect(videos.map((v) => v.title)).toContain("Processing Video");
      expect(videos.map((v) => v.title)).not.toContain("Waiting Video");
      expect(videos.map((v) => v.title)).not.toContain("Uploading Video");
    });

    it("should list all videos when includeIncomplete is true", async () => {
      const t = setupConvexTest();
      const { asUser } = await createAuthenticatedTestUser(t, {
        email: "complete-lister@example.com",
        name: "Complete Lister",
      });

      const profileId = await asUser.mutation(api.profiles.createProfile, {
        displayName: "Complete Lister",
        role: "coach",
      });

      await t.run(async (ctx) => {
        await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profileId,
          muxUploadId: "inc-1",
          title: "Ready",
          status: "ready",
        });

        await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profileId,
          muxUploadId: "inc-2",
          title: "Waiting",
          status: "waiting_for_upload",
        });
      });

      const allVideos = await asUser.query(api.mux.queries.listUserVideos, {
        includeIncomplete: true,
      });

      expect(allVideos).toHaveLength(2);
      expect(allVideos.map((v) => v.title)).toContain("Ready");
      expect(allVideos.map((v) => v.title)).toContain("Waiting");
    });

    it("should filter videos by status", async () => {
      const t = setupConvexTest();
      const { asUser } = await createAuthenticatedTestUser(t, {
        email: "filter-user@example.com",
        name: "Filter User",
      });

      const profileId = await asUser.mutation(api.profiles.createProfile, {
        displayName: "Filter User",
        role: "coach",
      });

      await t.run(async (ctx) => {
        await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profileId,
          muxUploadId: "filter-1",
          title: "Ready Video",
          status: "ready",
        });

        await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profileId,
          muxUploadId: "filter-2",
          title: "Processing Video 1",
          status: "processing",
        });

        await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profileId,
          muxUploadId: "filter-3",
          title: "Processing Video 2",
          status: "processing",
        });

        await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profileId,
          muxUploadId: "filter-4",
          title: "Error Video",
          status: "error",
        });
      });

      // Filter by "processing" status
      const processingVideos = await asUser.query(
        api.mux.queries.listUserVideos,
        {
          status: "processing",
          includeIncomplete: true,
        }
      );

      expect(processingVideos).toHaveLength(2);
      expect(processingVideos.every((v) => v.status === "processing")).toBe(
        true
      );
    });

    it("should only show user's own videos", async () => {
      const t = setupConvexTest();

      // User 1
      const { asUser: user1 } = await createAuthenticatedTestUser(t, {
        email: "user1@example.com",
        name: "User One",
      });

      const profile1Id = await user1.mutation(api.profiles.createProfile, {
        displayName: "User One",
        role: "coach",
      });

      // User 2
      const { asUser: user2 } = await createAuthenticatedTestUser(t, {
        email: "user2@example.com",
        name: "User Two",
      });

      const profile2Id = await user2.mutation(api.profiles.createProfile, {
        displayName: "User Two",
        role: "coach",
      });

      // Create videos for both users
      await t.run(async (ctx) => {
        await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profile1Id,
          muxUploadId: "user1-video",
          title: "User 1 Video",
          status: "ready",
        });

        await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profile2Id,
          muxUploadId: "user2-video",
          title: "User 2 Video",
          status: "ready",
        });
      });

      // User 1 should only see their video
      const user1Videos = await user1.query(api.mux.queries.listUserVideos, {});
      expect(user1Videos).toHaveLength(1);
      expect(user1Videos[0].title).toBe("User 1 Video");

      // User 2 should only see their video
      const user2Videos = await user2.query(api.mux.queries.listUserVideos, {});
      expect(user2Videos).toHaveLength(1);
      expect(user2Videos[0].title).toBe("User 2 Video");
    });

    it("should respect limit parameter", async () => {
      const t = setupConvexTest();
      const { asUser } = await createAuthenticatedTestUser(t, {
        email: "limit-test@example.com",
        name: "Limit Test",
      });

      const profileId = await asUser.mutation(api.profiles.createProfile, {
        displayName: "Limit Test",
        role: "coach",
      });

      // Create 5 videos
      await t.run(async (ctx) => {
        for (let i = 1; i <= 5; i++) {
          await ctx.runMutation(internal.mux.mutations.insertVideo, {
            uploadedBy: profileId,
            muxUploadId: `limit-video-${i}`,
            title: `Video ${i}`,
            status: "ready",
          });
        }
      });

      // Request only 3 videos
      const limitedVideos = await asUser.query(api.mux.queries.listUserVideos, {
        limit: 3,
      });

      expect(limitedVideos).toHaveLength(3);
    });

    it("should get video by ID", async () => {
      const t = setupConvexTest();
      const { asUser } = await createAuthenticatedTestUser(t, {
        email: "getter@example.com",
        name: "Video Getter",
      });

      const profileId = await asUser.mutation(api.profiles.createProfile, {
        displayName: "Video Getter",
        role: "coach",
      });

      const videoId = await t.run(async (ctx) => {
        return await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profileId,
          muxUploadId: "get-by-id-test",
          title: "Specific Video",
          description: "This is the video we're looking for",
          status: "ready",
        });
      });

      const video = await asUser.query(api.mux.queries.getVideoById, {
        videoId,
      });

      expect(video).toMatchObject({
        _id: videoId,
        title: "Specific Video",
        description: "This is the video we're looking for",
        status: "ready",
      });
    });

    it("should return null for non-existent video ID", async () => {
      const t = setupConvexTest();
      const { asUser } = await createAuthenticatedTestUser(t, {
        email: "null-getter@example.com",
        name: "Null Getter",
      });

      await asUser.mutation(api.profiles.createProfile, {
        displayName: "Null Getter",
        role: "coach",
      });

      // Create and delete a video to get valid but non-existent ID
      const { userId: authId } = await createAuthenticatedTestUser(t, {
        email: "temp3@example.com",
        name: "Temp3",
        hasCompletedOnboarding: true,
      });

      const profileId = await t.run(async (ctx) => {
        return await ctx.db.insert("userProfiles", {
          authId,
          displayName: "Temp3",
          role: "coach",
          verificationStatus: "unverified",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const deletedVideoId = await t.run(async (ctx) => {
        const id = await ctx.db.insert("videos", {
          uploadedBy: profileId,
          muxUploadId: "temp-get-test",
          muxAssetId: "",
          title: "Temp",
          status: "ready",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.delete(id);
        return id;
      });

      const video = await asUser.query(api.mux.queries.getVideoById, {
        videoId: deletedVideoId,
      });

      expect(video).toBeNull();
    });
  });

  describe("Abandoned Upload Cleanup", () => {
    it("should cleanup videos stuck in waiting_for_upload for >24 hours", async () => {
      const t = setupConvexTest();

      const { userId: authId } = await createAuthenticatedTestUser(t, {
        email: "cleanup@example.com",
        name: "Cleanup User",
        hasCompletedOnboarding: true,
      });

      const profileId = await t.run(async (ctx) => {
        return await ctx.db.insert("userProfiles", {
          authId,
          displayName: "Cleanup User",
          role: "coach",
          verificationStatus: "unverified",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      // Create stale video (>24 hours old)
      const staleTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago

      const staleVideoId = await t.run(async (ctx) => {
        return await ctx.db.insert("videos", {
          uploadedBy: profileId,
          muxUploadId: "stale-upload",
          muxAssetId: "",
          title: "Stale Upload",
          status: "waiting_for_upload",
          createdAt: staleTimestamp,
          updatedAt: staleTimestamp,
        });
      });

      // Create recent video (should NOT be deleted)
      const recentVideoId = await t.run(async (ctx) => {
        return await ctx.runMutation(internal.mux.mutations.insertVideo, {
          uploadedBy: profileId,
          muxUploadId: "recent-upload",
          title: "Recent Upload",
          status: "waiting_for_upload",
        });
      });

      // Run cleanup
      const result = await t.run(async (ctx) => {
        return await ctx.runMutation(
          internal.mux.mutations.cleanupAbandonedUploads
        );
      });

      expect(result.deletedCount).toBe(1);

      // Verify stale video was deleted
      const staleVideo = await t.run(async (ctx) => {
        return await ctx.db.get(staleVideoId);
      });
      expect(staleVideo).toBeNull();

      // Verify recent video still exists
      const recentVideo = await t.run(async (ctx) => {
        return await ctx.db.get(recentVideoId);
      });
      expect(recentVideo).not.toBeNull();
    });

    it("should cleanup videos stuck in uploading for >24 hours", async () => {
      const t = setupConvexTest();

      const { userId: authId } = await createAuthenticatedTestUser(t, {
        email: "cleanup2@example.com",
        name: "Cleanup User 2",
        hasCompletedOnboarding: true,
      });

      const profileId = await t.run(async (ctx) => {
        return await ctx.db.insert("userProfiles", {
          authId,
          displayName: "Cleanup User 2",
          role: "coach",
          verificationStatus: "unverified",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const staleTimestamp = Date.now() - 30 * 60 * 60 * 1000; // 30 hours ago

      const staleUploadingId = await t.run(async (ctx) => {
        return await ctx.db.insert("videos", {
          uploadedBy: profileId,
          muxUploadId: "stale-uploading",
          muxAssetId: "",
          title: "Stale Uploading",
          status: "uploading",
          createdAt: staleTimestamp,
          updatedAt: staleTimestamp,
        });
      });

      // Run cleanup
      await t.run(async (ctx) => {
        return await ctx.runMutation(
          internal.mux.mutations.cleanupAbandonedUploads
        );
      });

      // Verify was deleted
      const deletedVideo = await t.run(async (ctx) => {
        return await ctx.db.get(staleUploadingId);
      });
      expect(deletedVideo).toBeNull();
    });

    it("should NOT cleanup videos in processing or ready status", async () => {
      const t = setupConvexTest();

      const { userId: authId } = await createAuthenticatedTestUser(t, {
        email: "safe@example.com",
        name: "Safe User",
        hasCompletedOnboarding: true,
      });

      const profileId = await t.run(async (ctx) => {
        return await ctx.db.insert("userProfiles", {
          authId,
          displayName: "Safe User",
          role: "coach",
          verificationStatus: "unverified",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const oldTimestamp = Date.now() - 48 * 60 * 60 * 1000; // 48 hours ago

      // Create old videos in "safe" statuses
      const processingVideoId = await t.run(async (ctx) => {
        return await ctx.db.insert("videos", {
          uploadedBy: profileId,
          muxUploadId: "old-processing",
          muxAssetId: "asset-123",
          title: "Old Processing Video",
          status: "processing",
          createdAt: oldTimestamp,
          updatedAt: oldTimestamp,
        });
      });

      const readyVideoId = await t.run(async (ctx) => {
        return await ctx.db.insert("videos", {
          uploadedBy: profileId,
          muxUploadId: "old-ready",
          muxAssetId: "asset-456",
          title: "Old Ready Video",
          status: "ready",
          createdAt: oldTimestamp,
          updatedAt: oldTimestamp,
        });
      });

      // Run cleanup
      const result = await t.run(async (ctx) => {
        return await ctx.runMutation(
          internal.mux.mutations.cleanupAbandonedUploads
        );
      });

      expect(result.deletedCount).toBe(0);

      // Verify videos still exist
      const processingVideo = await t.run(async (ctx) => {
        return await ctx.db.get(processingVideoId);
      });
      expect(processingVideo).not.toBeNull();

      const readyVideo = await t.run(async (ctx) => {
        return await ctx.db.get(readyVideoId);
      });
      expect(readyVideo).not.toBeNull();
    });

    it("should handle cleanup when no stale videos exist", async () => {
      const t = setupConvexTest();

      // Run cleanup with no stale videos
      const result = await t.run(async (ctx) => {
        return await ctx.runMutation(
          internal.mux.mutations.cleanupAbandonedUploads
        );
      });

      expect(result.deletedCount).toBe(0);
    });
  });
});
