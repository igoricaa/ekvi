import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { requireActionCtx } from "@convex-dev/better-auth/utils";
import { betterAuth } from "better-auth";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { action } from "./_generated/server";
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
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Refresh every 24 hours
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url }) => {
        await sendResetPassword(requireActionCtx(ctx), {
          to: user.email,
          url,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, token }) => {
        await sendEmailVerification(requireActionCtx(ctx), {
          to: user.email,
          token,
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

// Generate a random token for verification
function generateToken(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

// Resend verification email to the current user
export const resendVerificationEmail = action({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);

    if (!authUser) {
      throw new Error("Not authenticated");
    }

    if (authUser.emailVerified) {
      throw new Error("Email already verified");
    }

    // Generate a new verification token
    const token = generateToken(32);
    const expiresAt = Date.now() + 86_400 * 1000; // 24 hours

    // Store the verification token
    await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "verification",
        data: {
          identifier: authUser.email,
          value: token,
          expiresAt,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
    });

    // Send the verification email
    await sendEmailVerification(ctx, {
      to: authUser.email,
      token,
    });

    return { success: true };
  },
});
