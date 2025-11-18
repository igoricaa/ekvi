// import "./polyfills";
// import MagicLinkEmail from "./emails/magicLink";
// import VerifyOTP from "./emails/verifyOTP";
// import { render } from "@react-email/components";

import { Resend } from "@convex-dev/resend";
import { render } from "@react-email/render";
import { components } from "./_generated/api";
import { ActionCtx } from "./_generated/server";
import ResetPasswordEmailTemplate from "./emails/components/resetPassword";
import VerifyEmailTemplate from "./emails/components/verifyEmail";

export const resend = new Resend(components.resend, {
  testMode: false,
});

// export const sendTestEmail = internalMutation({
//   handler: async (ctx) => {
//     await resend.sendEmail(ctx, {
//       from: "Me <test@mydomain.com>",
//       to: "delivered@resend.dev",
//       subject: "Hi there",
//       html: "This is a test email",
//     });
//   },
// });

export const sendEmailVerification = async (
  ctx: ActionCtx,
  {
    to,
    token,
  }: {
    to: string;
    token: string;
  }
) => {
  const siteUrl = process.env.SITE_URL || "http://localhost:3001";
  const verificationUrl = `${siteUrl}/api/auth/verify-email?token=${token}&callbackURL=/onboarding?verified=true`;

  await resend.sendEmail(ctx, {
    from: "EKVI <noreply@ekvilibrijum.rs>",
    to,
    subject: "Verify your email address",
    html: await render(<VerifyEmailTemplate verificationUrl={verificationUrl} />),
  });
};

export const sendResetPassword = async (
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
    from: "EKVI <noreply@ekvilibrijum.rs>",
    to,
    subject: "Reset your password",
    html: await render(<ResetPasswordEmailTemplate resetUrl={url} />),
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
