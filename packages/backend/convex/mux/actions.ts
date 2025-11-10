"use node";

import Mux from "@mux/mux-node";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { action, internalAction } from "../_generated/server";

/**
 * Mux Integration - Actions (Node.js Runtime)
 *
 * Functions that interact with Mux API.
 * Requires Node.js runtime for Mux SDK (crypto module).
 *
 * Use "use node" directive to enable Node.js environment.
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create authenticated Mux client
 */
function createMuxClient() {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;

  if (!(tokenId && tokenSecret)) {
    throw new Error(
      "Mux credentials not configured. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET environment variables."
    );
  }

  return new Mux({
    tokenId,
    tokenSecret,
  });
}

// ============================================================================
// INTERNAL ACTIONS
// ============================================================================

/**
 * Verify Mux Webhook Signature
 *
 * Verifies the signature of a Mux webhook request using the Mux SDK.
 * Must run in Node.js runtime for crypto module access.
 *
 * @param body - Raw webhook body (string)
 * @param signature - Mux-Signature header value
 * @param headers - All request headers
 * @returns Verification result with parsed event or error
 */
export const verifyMuxWebhook = internalAction({
  args: {
    body: v.string(),
    headers: v.any(),
  },
  handler: (_ctx, args) => {
    try {
      const webhookSecret = process.env.MUX_WEBHOOK_SIGNING_SECRET;
      if (!webhookSecret) {
        return {
          success: false,
          error: "Server configuration error",
        };
      }

      const mux = createMuxClient();

      const event = mux.webhooks.unwrap(args.body, args.headers, webhookSecret);

      return {
        success: true,
        event: {
          type: event.type,
          data: event.data,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Distinguish server config errors from client request errors
      if (
        errorMessage.includes("webhook secret") ||
        errorMessage.includes("configuration")
      ) {
        return {
          success: false,
          error: "Server configuration error",
        };
      }

      // Log the actual error for debugging
      console.error("Mux webhook verification failed:", errorMessage);

      return {
        success: false,
        error: "Invalid signature or webhook data",
      };
    }
  },
});

// ============================================================================
// PUBLIC ACTIONS
// ============================================================================

/**
 * Create Direct Upload
 *
 * Generates a Mux upload URL for direct browser uploads.
 *
 * @param title - Video title
 * @param description - Optional video description
 * @param corsOrigin - CORS origin for upload (defaults to wildcard)
 * @returns Upload URL, video ID, and upload ID
 */
export const createDirectUpload = action({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    corsOrigin: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ uploadUrl: string; videoId: any; muxUploadId: string }> => {
    const { profile } = await ctx.runQuery(api.profiles.getCurrentUser, {
      needImageUrl: false,
    });

    if (!profile) {
      throw new Error("Profile not found - complete onboarding first");
    }

    const mux = createMuxClient();

    try {
      const upload = await mux.video.uploads.create({
        new_asset_settings: {
          playback_policy: ["public"],
          video_quality: "plus",
        },
        cors_origin: args.corsOrigin || "*",
      });

      const videoId: any = await ctx.runMutation(
        internal.mux.mutations.insertVideo,
        {
          uploadedBy: profile._id,
          muxUploadId: upload.id,
          title: args.title,
          description: args.description,
          status: "waiting_for_upload",
        }
      );

      return {
        uploadUrl: upload.url,
        videoId,
        muxUploadId: upload.id,
      };
    } catch (error) {
      console.error("Failed to create Mux upload:", error);
      throw new Error(
        `Failed to create upload: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

// ============================================================================
// INTERNAL ACTIONS
// ============================================================================

/**
 * Delete Mux Asset (Internal Action)
 *
 * Deletes a video asset from Mux.
 * Called by deleteVideo mutation after DB record is deleted.
 */
export const deleteMuxAsset = internalAction({
  args: {
    assetId: v.string(),
  },
  handler: async (_ctx, args) => {
    const mux = createMuxClient();

    try {
      await mux.video.assets.delete(args.assetId);
      console.log("Successfully deleted Mux asset:", args.assetId);
    } catch (error) {
      // Log error but don't throw - video record already deleted
      console.error("Failed to delete Mux asset:", args.assetId, error);
    }
  },
});
