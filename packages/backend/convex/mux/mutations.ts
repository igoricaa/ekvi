import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, mutation } from "../_generated/server";
import { getCurrentUserProfile } from "../profiles";
import { videoStatusValidator } from "./types";

/**
 * Mux Integration - Mutations (V8 Isolate Runtime)
 *
 * Write operations for video data.
 * No external API calls - database operations only.
 */

// ============================================================================
// PUBLIC MUTATIONS
// ============================================================================

/**
 * Delete Video
 *
 * Deletes a video from both Convex DB and Mux.
 * Verifies user owns the video before deletion.
 */
export const deleteVideo = mutation({
  args: {
    videoId: v.id("videos"),
  },
  handler: async (ctx, args) => {
    // 1. Verify ownership
    const { profile } = await getCurrentUserProfile(ctx);

    const video = await ctx.db.get(args.videoId);
    if (!video) {
      throw new Error("Video not found");
    }

    if (video.uploadedBy !== profile._id) {
      throw new Error("Unauthorized - you don't own this video");
    }

    // 2. Delete from Mux (async, via action)
    if (video.muxAssetId) {
      await ctx.scheduler.runAfter(0, internal.mux.actions.deleteMuxAsset, {
        assetId: video.muxAssetId,
      });
    }

    // 3. Delete from database
    await ctx.db.delete(args.videoId);

    return { success: true };
  },
});

/**
 * Update Video Metadata
 *
 * Updates video title and description.
 * Verifies user owns the video before update.
 */
export const updateVideoMetadata = mutation({
  args: {
    videoId: v.id("videos"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify ownership
    const { profile } = await getCurrentUserProfile(ctx);

    const video = await ctx.db.get(args.videoId);
    if (!video) {
      throw new Error("Video not found");
    }

    if (video.uploadedBy !== profile._id) {
      throw new Error("Unauthorized - you don't own this video");
    }

    // Update metadata
    await ctx.db.patch(args.videoId, {
      ...(args.title && { title: args.title }),
      ...(args.description !== undefined && {
        description: args.description,
      }),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * Cleanup Abandoned Uploads (Internal)
 *
 * Deletes video records stuck in incomplete states for >24 hours.
 * Called by daily cron job at 3:00 AM UTC.
 *
 * Removes videos with status "waiting_for_upload" or "uploading"
 * that are older than 24 hours (likely abandoned by users).
 */
export const cleanupAbandonedUploads = internalMutation({
  args: {},
  handler: async (ctx) => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

    // Find stale uploads
    // TODO: da li da brišemo i "uploading" status?
    const staleVideos = await ctx.db
      .query("videos")
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("status"), "waiting_for_upload"),
            q.eq(q.field("status"), "uploading")
          ),
          q.lt(q.field("createdAt"), twentyFourHoursAgo)
        )
      )
      .collect();

    // Delete each stale video
    for (const video of staleVideos) {
      await ctx.db.delete(video._id);
    }

    console.log(`Cleaned up ${staleVideos.length} abandoned video uploads`);
    return { deletedCount: staleVideos.length };
  },
});

/**
 * Insert Video (Internal)
 *
 * Creates a new video record in the database.
 * Called by createDirectUpload action.
 */
export const insertVideo = internalMutation({
  args: {
    uploadedBy: v.id("userProfiles"),
    muxUploadId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    status: videoStatusValidator,
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("videos", {
      uploadedBy: args.uploadedBy,
      muxUploadId: args.muxUploadId,
      muxAssetId: "", // Will be set by webhook
      title: args.title,
      description: args.description,
      status: args.status,
      createdAt: now,
      updatedAt: now,
    });
  },
});
