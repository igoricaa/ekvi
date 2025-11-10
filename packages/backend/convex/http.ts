import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { handleMuxWebhook } from "./mux/httpActions";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

http.route({
  path: "/mux/webhook",
  method: "POST",
  handler: handleMuxWebhook,
});

export default http;
