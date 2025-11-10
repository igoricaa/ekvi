import { v } from "convex/values";
import { query } from "../_generated/server";
import { getCurrentUserProfile } from "../profiles";
import { videoStatusValidator } from "./types";

/**
 * Mux Integration - Queries (V8 Isolate Runtime)
 *
 * Fast read operations for video data.
 * No external API calls - pure database reads.
 */

/**
 * Get Video by ID
 *
 * Retrieves a video record by its Convex ID.
 */
export const getVideoById = query({
  args: {
    videoId: v.id("videos"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.videoId);
  },
});

/**
 * List User Videos
 *
 * Lists videos uploaded by the current user.
 * By default, excludes incomplete uploads (waiting_for_upload, uploading).
 * Set includeIncomplete: true to see all videos.
 */
export const listUserVideos = query({
  args: {
    status: v.optional(videoStatusValidator),
    limit: v.optional(v.number()),
    includeIncomplete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { profile } = await getCurrentUserProfile(ctx);

    let videosQuery = ctx.db
      .query("videos")
      .withIndex("by_uploadedBy", (q) => q.eq("uploadedBy", profile._id));

    // Filter out incomplete uploads by default
    if (!args.includeIncomplete) {
      videosQuery = videosQuery.filter((q) =>
        q.and(
          q.neq(q.field("status"), "waiting_for_upload"),
          q.neq(q.field("status"), "uploading")
        )
      );
    }

    // Apply status filter if provided
    if (args.status) {
      videosQuery = videosQuery.filter((q) =>
        q.eq(q.field("status"), args.status)
      );
    }

    // Apply limit and sort by newest first
    const videos = await videosQuery.order("desc").take(args.limit || 50);

    return videos;
  },
});
