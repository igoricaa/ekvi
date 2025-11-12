import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { requireActionCtx } from "@convex-dev/better-auth/utils";
import { betterAuth } from "better-auth";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authSchema from "./betterAuth/schema";
import { sendEmailVerification, sendResetPassword } from "./email";

const siteUrl = process.env.SITE_URL;

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  {
    local: {
      schema: authSchema,
    },
  }
);

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false }
) => {
  return betterAuth({
    // disable logging when createAuth is called just to generate options.
    // this is not required, but there's a lot of noise in logs without it.
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendOnSignUp: true,
      sendResetPassword: async ({ user, url }) => {
        await sendResetPassword(requireActionCtx(ctx), {
          to: user.email,
          url,
        });
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmailVerification(requireActionCtx(ctx), {
          to: user.email,
          url,
        });
      },
      verificationTokenExpiresIn: 86_400, // 24 hours in seconds
    },
    user: {
      deleteUser: {
        enabled: true,
      },
      additionalFields: {
        hasCompletedOnboarding: {
          type: "boolean",
          required: false,
          defaultValue: false,
        },
        accountStatus: {
          type: "string",
          required: false,
          defaultValue: "active",
        },
      },
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        enabled: !!process.env.GOOGLE_CLIENT_ID,
      },
    },
    plugins: [
      //   magicLink({
      //     sendMagicLink: async ({ email, url }) => {
      //       await sendMagicLink(requireActionCtx(ctx), {
      //         to: email,
      //         url,
      //       });
      //     },
      //   }),
      convex(),
    ],
  });
};

// Get the current user
// export const getCurrentUser = query({
//   args: {},
//   handler: (ctx) => {
//     return authComponent.getAuthUser(ctx);
//   },
// });
