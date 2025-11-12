// import "./polyfills";
// import VerifyEmail from "./emails/verifyEmail";
// import MagicLinkEmail from "./emails/magicLink";
// import VerifyOTP from "./emails/verifyOTP";
// import { render } from "@react-email/components";
// import React from "react";
// import ResetPasswordEmail from "./emails/resetPassword";

import { Resend } from "@convex-dev/resend";
import { render } from "@react-email/render";
import { components } from "./_generated/api";
import { ActionCtx, internalMutation } from "./_generated/server";
// import { type ActionCtx } from "./_generated/server";

export const resend = new Resend(components.resend, {
  testMode: true,
});

export const sendTestEmail = internalMutation({
  handler: async (ctx) => {
    await resend.sendEmail(ctx, {
      from: "Me <test@mydomain.com>",
      to: "delivered@resend.dev",
      subject: "Hi there",
      html: "This is a test email",
    });
  },
});

export const sendEmailVerification = async (
  ctx: ActionCtx,
  {
    to,
    url,
  }: {
    to: string;
    url: string;
  }
) => {
  await resend.sendEmail(ctx, {
    from: "Test <onboarding@boboddy.business>",
    to,
    subject: "Verify your email address",
    html: await render(<VerifyEmail url={url} />),
  });
};

// export const sendOTPVerification = async (
//   ctx: ActionCtx,
//   {
//     to,
//     code,
//   }: {
//     to: string;
//     code: string;
//   }
// ) => {
//   await resend.sendEmail(ctx, {
//     from: "Test <onboarding@boboddy.business>",
//     to,
//     subject: "Verify your email address",
//     html: await render(<VerifyOTP code={code} />),
//   });
// };

// export const sendMagicLink = async (
//   ctx: ActionCtx,
//   {
//     to,
//     url,
//   }: {
//     to: string;
//     url: string;
//   }
// ) => {
//   await resend.sendEmail(ctx, {
//     from: "Test <onboarding@boboddy.business>",
//     to,
//     subject: "Sign in to your account",
//     html: await render(<MagicLinkEmail url={url} />),
//   });
// };

// export const sendResetPassword = async (
//   ctx: ActionCtx,
//   {
//     to,
//     url,
//   }: {
//     to: string;
//     url: string;
//   }
// ) => {
//   await resend.sendEmail(ctx, {
//     from: "Test <onboarding@boboddy.business>",
//     to,
//     subject: "Reset your password",
//     html: await render(<ResetPasswordEmail url={url} />),
//   });
// };
