import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/**
 * Mux Integration - Webhook Handlers
 *
 * Internal mutations called by the HTTP webhook handler.
 * Process Mux webhook events and update database.
 */

/**
 * Handle video.upload.asset_created Webhook
 *
 * Called when Mux creates an asset from an upload.
 * Updates video record with asset ID and changes status to 'processing'.
 */
export const handleUploadAssetCreated = internalMutation({
  args: {
    uploadId: v.string(),
    assetId: v.string(),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_muxUploadId", (q) => q.eq("muxUploadId", args.uploadId))
      .first();

    if (!video) {
      console.error("Video not found for upload ID:", args.uploadId);
      return;
    }

    // Update with asset ID and processing status
    await ctx.db.patch(video._id, {
      muxAssetId: args.assetId,
      status: "processing",
      updatedAt: Date.now(),
    });

    console.log(
      "Video processing started:",
      video._id,
      "Asset ID:",
      args.assetId
    );
  },
});

/**
 * Handle video.asset.ready Webhook
 *
 * Called when Mux finishes encoding the video.
 * Updates video record with playback ID and metadata.
 */
export const handleAssetReady = internalMutation({
  args: {
    assetId: v.string(),
    playbackIds: v.array(v.any()),
    duration: v.optional(v.number()),
    aspectRatio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_muxAssetId", (q) => q.eq("muxAssetId", args.assetId))
      .first();

    if (!video) {
      console.error("Video not found for asset ID:", args.assetId);
      return;
    }

    const publicPlayback = args.playbackIds.find(
      (p: { policy: string }) => p.policy === "public"
    );
    const playbackId = publicPlayback?.id;

    if (!playbackId) {
      console.error("No public playback ID found for asset:", args.assetId);
      // Still mark as ready but without playback ID
    }

    const thumbnailUrl = playbackId
      ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0`
      : undefined;

    await ctx.db.patch(video._id, {
      status: "ready",
      muxPlaybackId: playbackId,
      duration: args.duration,
      aspectRatio: args.aspectRatio,
      thumbnailUrl,
      updatedAt: Date.now(),
    });

    console.log(
      "Video ready:",
      video._id,
      "Playback ID:",
      playbackId,
      "Duration:",
      args.duration
    );
  },
});

/**
 * Handle video.asset.errored Webhook
 *
 * Called when Mux encounters an error processing the video.
 * Updates video record with error status and message.
 */
export const handleAssetErrored = internalMutation({
  args: {
    assetId: v.string(),
    errors: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_muxAssetId", (q) => q.eq("muxAssetId", args.assetId))
      .first();

    if (!video) {
      console.error("Video not found for asset ID:", args.assetId);
      return;
    }

    const errorMessage =
      args.errors?.messages?.[0] ||
      args.errors?.message ||
      "Unknown encoding error";

    await ctx.db.patch(video._id, {
      status: "error",
      errorMessage,
      updatedAt: Date.now(),
    });

    console.error("Video processing error:", video._id, "Error:", errorMessage);
  },
});
