import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { resend } from "./email";
import { handleMuxWebhook } from "./mux/httpActions";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

http.route({
  path: "/mux/webhook",
  method: "POST",
  handler: handleMuxWebhook,
});

http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});

export default http;
