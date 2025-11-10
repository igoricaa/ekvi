import { internal } from "../_generated/api";
import { httpAction } from "../_generated/server";

/**
 * Mux Webhook HTTP Handler (V8 Runtime)
 *
 * Handles video lifecycle events from Mux.
 * Extracts webhook data and delegates signature verification to Node.js action.
 *
 * Events:
 * - video.upload.asset_created: Upload completed, asset created
 * - video.asset.ready: Video encoded and ready for playback
 * - video.asset.errored: Video encoding failed
 *
 * Security: Signature verification happens in Node.js action (verifyMuxWebhook).
 *
 * Endpoint URL (configure in Mux dashboard):
 * https://YOUR_DEPLOYMENT.convex.site/mux/webhook
 */
export const handleMuxWebhook = httpAction(async (ctx, request) => {
  try {
    const body = await request.text();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // TODO: proveri da li je unwrap dovoljan ili je potrebno i mux.webhooks.verifySignature(body, headers, secret);
    const verificationResult = await ctx.runAction(
      internal.mux.actions.verifyMuxWebhook,
      {
        body,
        headers,
      }
    );

    if (!verificationResult.success) {
      console.error(
        "Mux webhook: Verification failed:",
        verificationResult.error
      );
      return new Response(JSON.stringify({ error: verificationResult.error }), {
        status:
          verificationResult.error === "Server configuration error" ? 500 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const event = verificationResult.event;

    if (!event) {
      console.error("Mux webhook: No event received");
      return new Response(JSON.stringify({ error: "No event received" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("Mux webhook received:", event.type);

    switch (event.type) {
      case "video.upload.asset_created": {
        const data = event.data as any;

        const uploadId = data.id as string;
        const assetId = data.asset_id as string;

        await ctx.runMutation(internal.mux.webhooks.handleUploadAssetCreated, {
          uploadId,
          assetId,
        });
        break;
      }

      case "video.asset.ready": {
        const data = event.data as any;

        const assetId = data.id as string;
        const playbackIds = (data.playback_ids || []) as Array<{
          id: string;
          policy: string;
        }>;
        const duration = data.duration as number | undefined;
        const aspectRatio = data.aspect_ratio as string | undefined;

        await ctx.runMutation(internal.mux.webhooks.handleAssetReady, {
          assetId,
          playbackIds,
          duration,
          aspectRatio,
        });
        break;
      }

      case "video.asset.errored": {
        const data = event.data as any;
        const assetId = data.id as string;
        const errors = data.errors;

        await ctx.runMutation(internal.mux.webhooks.handleAssetErrored, {
          assetId,
          errors,
        });
        break;
      }

      default:
        console.log("Mux webhook: Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Mux webhook: Processing error:", error);

    return new Response(
      JSON.stringify({
        error: "Processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
