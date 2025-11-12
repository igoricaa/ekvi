# IZA-99: Advanced Authentication Features Implementation Plan

**Issue:** [IZA-99](https://linear.app/iza/issue/IZA-99/auth-email-verification-password-reset-magic-links)
**Priority:** Urgent
**Status:** In Progress
**Assigned:** stanisavljevic.igor@proton.me

---

## 📊 Current State Analysis

### ✅ What's Already Implemented

1. **Better Auth Integration**
   - Version: `better-auth@1.3.27`
   - Convex adapter: `@convex-dev/better-auth@0.9.7`
   - Email & password authentication enabled
   - Google OAuth provider configured
   - Database schema with `emailVerified` field
   - `verification` table for tokens
   - `requireEmailVerification: false` (needs to be enabled)

2. **Existing UI Pages**
   - `/sign-up` - User registration with email/password
   - `/sign-in` - Login with email/password + Google OAuth
   - `/reset-password` - Password reset form (accepts token from URL)
   - `/verify-2fa` - Two-factor verification page

3. **Existing Backend Functions**
   - `authComponent` - Better Auth Convex adapter
   - `createAuth()` - Auth configuration factory
   - Email utilities scaffolded in `convex/email.tsx` (all commented out)

4. **Existing Validation Schemas**
   - `signUpSchema` - Registration validation
   - `signInSchema` - Login validation
   - `passwordResetSchema` - Reset password validation
   - `passwordResetRequestSchema` - Request reset validation
   - `twoFactorSchema` - 2FA code validation

5. **Environment Variables**
   - `RESEND_API_KEY` - Already in `.env.example`
   - `SITE_URL` - Configured
   - `NEXT_PUBLIC_CONVEX_SITE_URL` - Configured

### ❌ What's Missing

1. **Email Infrastructure**
   - Resend component not installed in Convex
   - Email sending functions commented out
   - No email templates (React Email)
   - No email action endpoints

2. **Email Verification Flow**
   - Not configured in Better Auth
   - No verification email sending
   - No `/verify-email` page
   - No "resend verification" functionality
   - Sign-up doesn't trigger verification email

3. **Password Reset Enhancement**
   - No email sending for reset links
   - Better Auth `sendResetPassword` not configured
   - No proper expired token handling

4. **Magic Link Authentication**
   - Plugin not enabled in Better Auth
   - Plugin commented out in `auth.ts:62-69`
   - No client-side plugin
   - No magic link UI in sign-in page
   - No email template

5. **Email Templates**
   - No React Email templates created
   - No shared email components
   - No branding/styling

---

## 🏗️ Architecture Decisions

### Email Provider: Resend

**Why Resend?**
- Already in `.env.example` (team decision made)
- Official Convex component (`@convex-dev/resend`)
- Simple API, excellent deliverability
- React Email support
- Generous free tier (100 emails/day)
- Great DX with TypeScript support

**Alternatives Considered:**
- SendGrid (more complex API)
- AWS SES (infrastructure overhead)
- Postmark (cost)

### Email Template Strategy: React Email

**Why React Email?**
- Write emails in React (familiar DX)
- Type-safe components
- Automatic responsive design
- Live preview during development
- Compiled to HTML for maximum compatibility
- Works with all email clients

**Template Architecture:**
```
emails/
├── components/          # Shared components
│   ├── Button.tsx      # CTA buttons
│   ├── Header.tsx      # EKVI branding
│   ├── Footer.tsx      # Unsubscribe, legal
│   └── Layout.tsx      # Base wrapper
├── verify-email.tsx    # Email verification
├── reset-password.tsx  # Password reset
├── magic-link.tsx      # Magic link sign-in
└── welcome.tsx         # Post-verification welcome
```

### Token Expiration Policies

| Token Type | Expiration | Reason |
|------------|------------|--------|
| Email Verification | 24 hours | Balance security & UX |
| Password Reset | 24 hours | Security standard |
| Magic Link | 15 minutes | One-time use, high security |

### Security Considerations

1. **Token Generation**
   - Handled by Better Auth (cryptographically secure)
   - Stored in Convex `verification` table
   - One-time use for magic links

2. **Email Enumeration Protection**
   - Always show "email sent" message (even if user doesn't exist)
   - Don't reveal if email exists in system

3. **Rate Limiting**
   - Max 1 verification email per 60 seconds per email
   - Max 1 password reset per 60 seconds per email
   - Max 1 magic link per 60 seconds per email
   - Implement using Convex queries + timestamps

4. **HTTPS Enforcement**
   - All tokens sent via HTTPS only
   - Magic links use HTTPS callbacks
   - Verify `SITE_URL` uses HTTPS in production

### Error Handling Strategy

**Principle:** Graceful degradation with clear user communication

1. **Email Sending Failures**
   - Catch Resend API errors
   - Log to Convex for debugging
   - Show generic "failed to send" message to user
   - Provide "try again" button

2. **Invalid Tokens**
   - Clear error messages
   - Provide path to request new token
   - Log suspicious activity (potential attacks)

3. **Expired Tokens**
   - Clear expiration messaging
   - One-click "request new link"
   - Preserve user context (email pre-filled)

---

## 📋 Implementation Checklist

### Phase 1: Email Infrastructure Setup

**Goal:** Get email sending working end-to-end

- [ ] **1.1** Install dependencies in `packages/backend`
  ```bash
  pnpm --filter backend add @convex-dev/resend resend @react-email/components react-email
  ```

- [ ] **1.2** Add Resend component to `packages/backend/convex/convex.config.ts`
  ```typescript
  import { defineApp } from "convex/server";
  import resend from "@convex-dev/resend/convex.config";

  const app = defineApp();
  app.use(resend);
  export default app;
  ```

- [ ] **1.3** Verify `RESEND_API_KEY` in environment
  - Check `.env.local` has the key
  - Test with Resend sandbox domain initially
  - Document in `.env.example` if needed

- [ ] **1.4** Uncomment `packages/backend/convex/email.tsx`
  - Remove all comment markers
  - Update import paths
  - Add proper TypeScript types
  - Update sender email from placeholder

- [ ] **1.5** Test email sending with simple test
  - Create temporary test action
  - Send test email to personal email
  - Verify delivery
  - Check spam folder

**Acceptance Criteria:**
- ✅ Dependencies installed without errors
- ✅ Convex dev server starts successfully
- ✅ Test email sent and received
- ✅ No TypeScript errors

---

### Phase 2: Email Templates (React Email)

**Goal:** Professional, branded email templates ready to use

- [ ] **2.1** Create email templates directory
  ```bash
  mkdir -p packages/backend/convex/emails/components
  ```

- [ ] **2.2** Create base layout component: `emails/components/Layout.tsx`
  - HTML email boilerplate
  - Responsive container (600px max width)
  - Font stack (system fonts)
  - Background color
  - Padding/spacing

- [ ] **2.3** Create header component: `emails/components/Header.tsx`
  - EKVI logo (inline SVG or hosted image)
  - Brand colors
  - Consistent height

- [ ] **2.4** Create footer component: `emails/components/Footer.tsx`
  - Copyright text
  - "You received this email because..." text
  - Links: Help Center, Privacy Policy
  - Physical address (if required by law)

- [ ] **2.5** Create button component: `emails/components/Button.tsx`
  - Primary CTA styling
  - Full-width responsive
  - Hover states (where supported)
  - Accessible (contrast ratio 4.5:1+)

- [ ] **2.6** Create verification email: `emails/verify-email.tsx`
  - **Subject:** "Verify your email address"
  - Greeting with user name
  - Explanation of why they're receiving this
  - Large "Verify Email" button
  - Alternative: plain link for accessibility
  - Expiration notice (24 hours)
  - Security disclaimer ("didn't sign up? ignore this")

- [ ] **2.7** Create password reset email: `emails/reset-password.tsx`
  - **Subject:** "Reset your password"
  - Greeting with user name
  - "We received a request to reset your password"
  - Large "Reset Password" button
  - Alternative: plain link
  - Expiration notice (24 hours)
  - Security disclaimer ("didn't request? contact us")

- [ ] **2.8** Create magic link email: `emails/magic-link.tsx`
  - **Subject:** "Sign in to EKVI"
  - Greeting
  - "Click below to sign in to your account"
  - Large "Sign In" button
  - Alternative: plain link
  - Expiration notice (15 minutes)
  - Security disclaimer
  - One-time use notice

- [ ] **2.9** (Optional) Create welcome email: `emails/welcome.tsx`
  - Sent after email verification
  - Welcome message
  - Next steps
  - Links to key resources

- [ ] **2.10** Test email rendering
  - Use `react-email` dev server for live preview
  - Test in email clients: Gmail, Outlook, Apple Mail
  - Verify mobile rendering
  - Check dark mode appearance
  - Validate HTML (no broken tags)

**Acceptance Criteria:**
- ✅ All templates render without errors
- ✅ Templates display correctly on mobile
- ✅ Templates display correctly on desktop
- ✅ Buttons are clickable in all email clients
- ✅ Links work correctly
- ✅ Professional, branded appearance
- ✅ Consistent typography and spacing

---

### Phase 3: Email Verification Flow

**Goal:** Users must verify their email before accessing the app

- [ ] **3.1** Update Better Auth config in `packages/backend/convex/auth.ts`
  ```typescript
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true, // ENABLE THIS
    sendOnSignUp: true, // Auto-send verification
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      await sendEmailVerification(requireActionCtx(ctx), {
        to: user.email,
        url,
      });
    },
    verificationTokenExpiresIn: 86400, // 24 hours in seconds
  },
  ```

- [ ] **3.2** Implement `sendEmailVerification` action in `email.tsx`
  - Accept `ctx`, `to`, `url` parameters
  - Render `verify-email.tsx` template
  - Call `resend.sendEmail()`
  - Error handling with try/catch
  - Log success/failure

- [ ] **3.3** Create `/verify-email` page: `apps/web/app/(unauth)/verify-email/page.tsx`
  - Extract `token` from URL query params
  - Call `authClient.verifyEmail({ query: { token } })` on mount
  - Show loading state during verification
  - Show success state (✓ Email verified!)
  - Show error state (expired, invalid)
  - Auto-redirect to onboarding after 2s on success
  - "Back to sign in" link on error

- [ ] **3.4** Create resend verification button component: `components/auth/ResendEmailButton.tsx`
  - Props: `email: string`
  - State: loading, cooldown timer
  - Call `authClient.sendVerificationEmail()`
  - Show 60s countdown after sending
  - Disable during cooldown
  - Error handling

- [ ] **3.5** Update sign-up flow in `apps/web/app/(unauth)/sign-up/sign-up.tsx`
  - After successful signup, redirect to `/verify-email-sent`
  - Don't auto-sign in
  - Pass email via URL query param (for resend functionality)

- [ ] **3.6** Create `/verify-email-sent` page
  - "Check your email" message
  - Show which email it was sent to
  - "Didn't receive it?" section
  - ResendEmailButton component
  - "Change email" link (back to sign-up)

- [ ] **3.7** Update sign-in to block unverified users
  - Better Auth already handles this
  - Verify error message is user-friendly
  - Show "Resend verification email" link in error
  - Pre-fill email if they tried to sign in

- [ ] **3.8** Add verification status to user dashboard
  - Show "Email not verified" banner if applicable
  - CTA to verify email
  - ResendEmailButton

- [ ] **3.9** Handle edge cases
  - Email already verified (show success, redirect)
  - Expired token (clear message, resend option)
  - Invalid token (error message, help text)
  - User doesn't exist for token (security: generic error)

- [ ] **3.10** End-to-end testing
  - Sign up → receive email → verify → redirected
  - Sign up → try to sign in → blocked → verify → success
  - Sign up → wait 25h → token expires → request new → verify
  - Resend verification works with cooldown
  - Already verified user clicking link → success message

**Acceptance Criteria:**
- ✅ New users receive verification email immediately
- ✅ Users cannot sign in until verified
- ✅ Verification link works correctly
- ✅ Expired tokens handled gracefully
- ✅ Resend functionality works with rate limiting
- ✅ All edge cases tested
- ✅ Error messages are clear and actionable

---

### Phase 4: Password Reset Enhancement

**Goal:** Fully functional password reset with email delivery

- [ ] **4.1** Configure Better Auth `sendResetPassword` in `auth.ts`
  ```typescript
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url, token }, request) => {
      await sendResetPassword(requireActionCtx(ctx), {
        to: user.email,
        url,
      });
    },
    resetPasswordTokenExpiresIn: 86400, // 24 hours
    onPasswordReset: async ({ user }, request) => {
      // Optional: logging, analytics, notification
      console.log(`Password reset for user: ${user.id}`);
    },
  },
  ```

- [ ] **4.2** Implement `sendResetPassword` action in `email.tsx`
  - Accept `ctx`, `to`, `url` parameters
  - Render `reset-password.tsx` template
  - Call `resend.sendEmail()`
  - Error handling
  - Logging

- [ ] **4.3** Update `/reset-password` page error handling
  - Detect expired token (Better Auth returns error)
  - Show clear "Link expired" message
  - Provide "Request new reset link" button
  - Pre-fill email from previous request (if available)

- [ ] **4.4** Update sign-in page "Forgot password" flow
  - Already exists at `sign-in.tsx:72-91`
  - Verify it calls `authClient.forgetPassword()`
  - Ensure redirect URL is correct
  - Show success toast with better message

- [ ] **4.5** Create `/reset-password-sent` page (optional)
  - "Check your email" message
  - Show which email
  - "Didn't receive it?" section
  - Resend button (with cooldown)

- [ ] **4.6** Add password strength validation
  - Already exists in validation schema (line 78-80)
  - Verify requirements: 8+ chars, uppercase, lowercase, number
  - Show requirements on reset page
  - Real-time validation feedback

- [ ] **4.7** Handle edge cases
  - Email doesn't exist (security: still show "email sent")
  - Expired token (clear message + resend)
  - Invalid token (error + help)
  - Password doesn't meet requirements (validation errors)

- [ ] **4.8** End-to-end testing
  - Request reset → receive email → reset password → sign in
  - Request reset for non-existent email → generic success
  - Wait 25h → link expires → request new → success
  - Try weak password → validation error → fix → success

**Acceptance Criteria:**
- ✅ Password reset emails delivered reliably
- ✅ Reset links work correctly
- ✅ Expired tokens handled gracefully
- ✅ Password strength enforced
- ✅ Security best practices (no email enumeration)
- ✅ All edge cases tested

---

### Phase 5: Magic Link Authentication

**Goal:** Passwordless sign-in via email link

- [ ] **5.1** Install Better Auth magic link plugin (backend)
  - Already included in `better-auth@1.3.27`
  - Import: `import { magicLink } from "better-auth/plugins";`

- [ ] **5.2** Configure magic link plugin in `packages/backend/convex/auth.ts`
  ```typescript
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url, token }, request) => {
        await sendMagicLink(requireActionCtx(ctx), {
          to: email,
          url,
        });
      },
      expiresIn: 900, // 15 minutes
      disableSignUp: false, // Allow new user registration
    }),
    convex(), // Keep existing plugin
  ],
  ```

- [ ] **5.3** Implement `sendMagicLink` action in `email.tsx`
  - Accept `ctx`, `to`, `url` parameters
  - Render `magic-link.tsx` template
  - Call `resend.sendEmail()`
  - Error handling
  - Logging

- [ ] **5.4** Install magic link client plugin
  - Already in `better-auth@1.3.27`
  - Update `apps/web/lib/auth-client.ts`:
  ```typescript
  import { magicLinkClient } from "better-auth/client/plugins";

  export const authClient = createAuthClient({
    plugins: [
      convexClient(),
      magicLinkClient(), // Add this
    ],
  });
  ```

- [ ] **5.5** Add magic link validation schema
  - Create in `apps/web/lib/validations/user-schemas.ts`
  ```typescript
  export const magicLinkSchema = z.object({
    email: z.string().email("Valid email required"),
  });
  export type MagicLinkFormValues = z.infer<typeof magicLinkSchema>;
  ```

- [ ] **5.6** Add magic link UI to sign-in page
  - New state: `showMagicLink: boolean`
  - Toggle between password and magic link modes
  - Magic link form: email only, no password
  - "Sign in with Magic Link" button
  - Loading state while sending
  - Call `authClient.signIn.magicLink({ email, callbackURL: "/" })`

- [ ] **5.7** Create `/magic-link-sent` page
  - "Check your email" message
  - Show email it was sent to
  - Expiration notice (15 minutes)
  - "Didn't receive it?" section
  - Resend button (60s cooldown)
  - "Try another method" link

- [ ] **5.8** Verify magic link verification route
  - Better Auth auto-creates `/api/auth/magic-link/verify`
  - Verify it exists in `apps/web/app/api/auth/[...all]/route.ts`
  - Test the route manually

- [ ] **5.9** Handle new user sign-up via magic link
  - Configure `disableSignUp: false`
  - Test magic link for non-existent email
  - Verify user is created
  - Verify they're redirected to onboarding
  - Set `emailVerified: true` automatically

- [ ] **5.10** Handle existing user sign-in via magic link
  - Test with existing user email
  - Verify they're signed in
  - Verify redirect to dashboard (or custom callbackURL)

- [ ] **5.11** Implement rate limiting
  - Max 1 magic link per 60s per email
  - Store last request timestamp
  - Show countdown timer
  - Clear error if limit exceeded

- [ ] **5.12** Add magic link option to sign-up page (optional)
  - "Sign up with Magic Link" button
  - Same flow as sign-in
  - Creates new account + verifies email in one step

- [ ] **5.13** Security: Enforce one-time use
  - Better Auth handles this automatically
  - Test: click link twice → second time fails
  - Show clear error message

- [ ] **5.14** Handle edge cases
  - Expired link (15 min) → error + resend option
  - Invalid token → error + help
  - Link already used → error + request new
  - Email sending fails → show error + retry

- [ ] **5.15** End-to-end testing
  - New user: magic link → sign up → auto-verify → onboarding
  - Existing user: magic link → sign in → dashboard
  - Expired link → error → request new → success
  - Link reuse → blocked
  - Rate limiting → enforced

**Acceptance Criteria:**
- ✅ Magic link emails sent successfully
- ✅ Magic links work for sign-in
- ✅ Magic links work for sign-up
- ✅ Links expire after 15 minutes
- ✅ One-time use enforced
- ✅ Rate limiting works
- ✅ All edge cases handled
- ✅ Clear user feedback at each step

---

### Phase 6: Polish & Testing

**Goal:** Production-ready, thoroughly tested implementation

- [ ] **6.1** Cross-browser testing
  - Chrome (Windows, macOS)
  - Firefox (Windows, macOS)
  - Safari (macOS, iOS)
  - Edge (Windows)
  - Test all auth flows in each browser

- [ ] **6.2** Email client testing
  - Gmail (web, mobile app)
  - Outlook (web, desktop, mobile)
  - Apple Mail (macOS, iOS)
  - Yahoo Mail
  - ProtonMail
  - Verify all links clickable
  - Verify rendering (no broken layouts)

- [ ] **6.3** Mobile responsive testing
  - iOS (Safari, Chrome)
  - Android (Chrome, Samsung Internet)
  - Test all auth pages on small screens
  - Test emails on mobile clients
  - Verify touch targets are 44px+

- [ ] **6.4** Accessibility audit (WCAG 2.1 Level AA)
  - Keyboard navigation (all flows completable via keyboard)
  - Screen reader testing (VoiceOver, NVDA)
  - Color contrast (4.5:1 for text, 3:1 for UI)
  - Focus indicators visible
  - Error messages associated with fields (aria-describedby)
  - Form labels properly associated

- [ ] **6.5** Performance optimization
  - Measure email delivery time (target: < 5s)
  - Optimize email template size (< 100kb)
  - Lazy load images in emails (if any)
  - Verify page load times (< 2s)
  - Check bundle size impact

- [ ] **6.6** Error message consistency
  - Review all error messages
  - Ensure consistent tone (helpful, not blaming)
  - Provide actionable next steps
  - No technical jargon
  - Grammar and spelling check

- [ ] **6.7** Loading states refinement
  - All buttons show loading spinners
  - Disable during loading
  - No layout shift
  - Smooth transitions

- [ ] **6.8** Security audit
  - Review all token handling
  - Verify HTTPS enforcement
  - Check for XSS vulnerabilities
  - Verify CSRF protection
  - Check for email enumeration
  - Review rate limiting effectiveness
  - Test magic link one-time use
  - Verify token expiration

- [ ] **6.9** Documentation
  - Update CLAUDE.md with auth patterns
  - Document environment variables
  - Create troubleshooting guide
  - Document testing procedures

- [ ] **6.10** Linear issue updates
  - Update IZA-99 with progress
  - Add screenshots of flows
  - Mark sub-tasks complete
  - Update status to "In Review" when done

**Acceptance Criteria:**
- ✅ All browsers tested and working
- ✅ All email clients tested and working
- ✅ Mobile responsive verified
- ✅ WCAG 2.1 Level AA compliant
- ✅ Performance targets met
- ✅ No security vulnerabilities
- ✅ Documentation complete
- ✅ Linear issue updated

---

### Phase 7: Two-Factor Authentication (OPTIONAL - Stretch Goal)

**Goal:** TOTP-based 2FA with backup codes

- [ ] **7.1** Install Better Auth 2FA plugin
  - Already in `better-auth@1.3.27`
  - Import: `import { twoFactor } from "better-auth/plugins";`

- [ ] **7.2** Configure 2FA plugin in `auth.ts`
  ```typescript
  plugins: [
    twoFactor({
      issuer: "EKVI", // Shows in authenticator app
      totpWindow: 1, // Allow 1 time step before/after
    }),
    // ... other plugins
  ],
  ```

- [ ] **7.3** Install 2FA client plugin
  ```typescript
  import { twoFactorClient } from "better-auth/client/plugins";

  export const authClient = createAuthClient({
    plugins: [
      convexClient(),
      magicLinkClient(),
      twoFactorClient(), // Add this
    ],
  });
  ```

- [ ] **7.4** Create 2FA setup page: `/settings/security/two-factor`
  - Check if 2FA is already enabled
  - Generate QR code: `authClient.twoFactor.getTotpUri()`
  - Display QR code (use `qrcode.react` library)
  - Show secret key (for manual entry)
  - Verification input (6 digits)
  - Enable 2FA: `authClient.twoFactor.enable({ code })`

- [ ] **7.5** Generate and display backup codes
  - After enabling 2FA: `authClient.twoFactor.generateBackupCodes()`
  - Display codes in grid
  - "Download as text file" button
  - "I've saved these codes" confirmation checkbox
  - Warning: keep codes safe, they're shown once

- [ ] **7.6** Update `/verify-2fa` page
  - Already exists at `apps/web/app/(unauth)/verify-2fa/page.tsx`
  - Enhance with better UX
  - Add "Use backup code" option
  - Auto-focus on input
  - Auto-submit when 6 digits entered

- [ ] **7.7** Create 2FA disable functionality
  - In settings, show "Disable 2FA" button
  - Require password confirmation
  - Call `authClient.twoFactor.disable()`
  - Revoke all backup codes

- [ ] **7.8** Backup code recovery flow
  - On verify-2fa page, "Use backup code" link
  - Input field for backup code
  - Verify: `authClient.twoFactor.verifyBackupCode({ code })`
  - Mark code as used (one-time use)

- [ ] **7.9** Enforce 2FA for admin users
  - Check user role after login
  - If admin and 2FA not enabled, redirect to setup
  - Block admin dashboard access until 2FA enabled
  - Show prominent banner

- [ ] **7.10** 2FA status in user profile
  - Show "2FA Enabled ✓" badge
  - Link to manage 2FA settings
  - Show enabled date

- [ ] **7.11** Handle lost 2FA device (account recovery)
  - Create support email for recovery requests
  - Manual verification process (out of scope for automation)
  - Document recovery procedure

- [ ] **7.12** End-to-end testing
  - Enable 2FA → scan QR → verify → enabled
  - Sign out → sign in → prompted for code → verify → success
  - Use backup code → works → marked as used
  - Disable 2FA → re-enable → new secret generated
  - Admin enforcement → works

**Acceptance Criteria:**
- ✅ 2FA can be enabled/disabled
- ✅ QR codes generate correctly
- ✅ Authenticator apps work (Google, Authy, 1Password)
- ✅ Backup codes generated and work
- ✅ Admin enforcement works
- ✅ All edge cases tested

---

## 📦 Dependencies Reference

### Backend (`packages/backend/package.json`)

```json
{
  "dependencies": {
    "@convex-dev/resend": "^1.0.0",
    "resend": "^4.0.0",
    "@react-email/components": "^0.0.25",
    "react-email": "^3.0.1",
    "@mux/mux-node": "^12.8.0",
    "convex": "^1.28.2"
  }
}
```

### Web (`apps/web/package.json`)

No additional dependencies needed (React Email only for backend)

---

## 🗂️ File Creation/Modification Map

### New Files to Create (18 files)

```
packages/backend/convex/
├── emails/
│   ├── components/
│   │   ├── Layout.tsx          # Base email wrapper
│   │   ├── Header.tsx          # EKVI branding
│   │   ├── Footer.tsx          # Legal, links
│   │   └── Button.tsx          # CTA button
│   ├── verify-email.tsx        # Email verification template
│   ├── reset-password.tsx      # Password reset template
│   ├── magic-link.tsx          # Magic link template
│   └── welcome.tsx             # Welcome email (optional)

apps/web/
├── app/(unauth)/
│   ├── verify-email/
│   │   └── page.tsx            # Email verification page
│   ├── verify-email-sent/
│   │   └── page.tsx            # Check email confirmation
│   ├── magic-link-sent/
│   │   └── page.tsx            # Magic link sent confirmation
│   └── reset-password-sent/    # (Optional)
│       └── page.tsx
└── components/
    └── auth/
        ├── ResendEmailButton.tsx   # Reusable resend button
        └── MagicLinkForm.tsx       # Magic link form component
```

### Files to Modify (7 files)

```
packages/backend/convex/
├── email.tsx                   # Uncomment & update all functions
├── auth.ts                     # Enable plugins, configure callbacks
└── convex.config.ts           # Add Resend component

apps/web/
├── lib/
│   ├── auth-client.ts         # Add magic link plugin
│   └── validations/
│       └── user-schemas.ts    # Add magic link schema
├── app/(unauth)/
│   ├── sign-up/
│   │   └── sign-up.tsx        # Update post-signup flow
│   ├── sign-in/
│   │   └── sign-in.tsx        # Add magic link option
│   └── reset-password/
│       └── page.tsx           # Enhanced error handling
```

---

## 🔒 Security Checklist

- [ ] All tokens use Better Auth's secure generation
- [ ] Tokens stored securely in Convex `verification` table
- [ ] HTTPS enforced for all links (verify `SITE_URL`)
- [ ] No email enumeration (generic success messages)
- [ ] Rate limiting on all email endpoints
- [ ] Magic links are one-time use
- [ ] Tokens have appropriate expiration times
- [ ] CSRF protection via Better Auth
- [ ] Session security via Better Auth
- [ ] XSS protection (React escaping)
- [ ] No sensitive data in email templates
- [ ] Error messages don't leak system info

---

## 🧪 Testing Matrix

### Email Verification Flow

| Scenario | Expected Result | Status |
|----------|----------------|--------|
| Sign up → receive email | Email delivered < 5s | ⬜ |
| Click verify link | Email marked verified | ⬜ |
| Try to sign in before verify | Blocked with message | ⬜ |
| Verify → sign in | Success | ⬜ |
| Click expired link (25h) | Clear error + resend | ⬜ |
| Click already-used link | Success (idempotent) | ⬜ |
| Resend email (60s cooldown) | Cooldown enforced | ⬜ |

### Password Reset Flow

| Scenario | Expected Result | Status |
|----------|----------------|--------|
| Request reset | Email delivered | ⬜ |
| Click reset link | Form loads | ⬜ |
| Submit new password | Success + redirect | ⬜ |
| Click expired link | Error + resend option | ⬜ |
| Request for non-existent email | Generic "email sent" (security) | ⬜ |
| Weak password | Validation error | ⬜ |

### Magic Link Flow

| Scenario | Expected Result | Status |
|----------|----------------|--------|
| Request magic link (new user) | Email delivered | ⬜ |
| Click link (new user) | Account created + signed in | ⬜ |
| Request magic link (existing) | Email delivered | ⬜ |
| Click link (existing) | Signed in | ⬜ |
| Click expired link (16 min) | Error + resend | ⬜ |
| Click link twice | Second click fails | ⬜ |
| Rate limit (3 requests in 60s) | Throttled | ⬜ |

### Email Client Compatibility

| Client | Desktop | Mobile | Status |
|--------|---------|--------|--------|
| Gmail | ⬜ | ⬜ | ⬜ |
| Outlook | ⬜ | ⬜ | ⬜ |
| Apple Mail | ⬜ | ⬜ | ⬜ |
| Yahoo Mail | ⬜ | N/A | ⬜ |
| ProtonMail | ⬜ | ⬜ | ⬜ |

---

## 📈 Success Metrics

### Performance Targets

- Email delivery time: < 5 seconds (99th percentile)
- Email template size: < 100kb
- Page load time: < 2 seconds
- Email open rate: > 50%
- Email click-through rate: > 20%

### Functionality Metrics

- Email verification completion rate: > 80%
- Password reset completion rate: > 60%
- Magic link success rate: > 90%
- Email deliverability: > 95% (not in spam)

---

## 🚀 Deployment Strategy

### Phase 1: Infrastructure (No user impact)
1. Deploy email sending infrastructure
2. Deploy email templates
3. Test with test accounts only

### Phase 2: Soft Launch (Opt-in)
1. Deploy email verification (disabled by default)
2. Test with beta users
3. Deploy magic link (hidden UI, direct link access only)
4. Monitor error rates for 48 hours

### Phase 3: Gradual Rollout
1. Enable email verification for 10% of new signups
2. Monitor metrics (completion rate, errors)
3. Increase to 50% after 24h
4. Full rollout after 48h if metrics good

### Phase 4: Magic Link Rollout
1. Add magic link UI to sign-in page
2. Monitor adoption rate
3. Gather user feedback
4. Iterate based on feedback

### Phase 5: 2FA (If implemented)
1. Enable for admins first (enforced)
2. Make available to all users (optional)
3. Monitor adoption
4. Consider making mandatory for sensitive operations

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **Email Deliverability**
   - Dependent on Resend's delivery rates
   - May land in spam initially (SPF/DKIM needed)
   - Free tier: 100 emails/day limit

2. **Verification Tokens**
   - Fixed 24h expiration (not configurable per-user)
   - No token revocation endpoint (rely on expiration)

3. **Magic Links**
   - 15min expiration (may be too short for some users)
   - No "extend link" functionality

4. **Rate Limiting**
   - Simple time-based (no distributed rate limiting)
   - Per-email only (not per-IP)

### Future Enhancements

- [ ] Email template personalization (user name, etc.)
- [ ] A/B testing different email copy
- [ ] Email analytics (opens, clicks)
- [ ] SMS fallback for email delivery issues
- [ ] Social login email verification bypass
- [ ] Biometric authentication (WebAuthn)
- [ ] Remember device (skip 2FA for 30 days)

---

## 📚 Resources & References

### Documentation

- [Better Auth Docs](https://www.better-auth.com/docs)
- [Better Auth Magic Link Plugin](https://www.better-auth.com/docs/plugins/magic-link)
- [Better Auth Email Verification](https://www.better-auth.com/docs/authentication/email-password)
- [Resend Docs](https://resend.com/docs)
- [React Email Docs](https://react.email/docs/introduction)
- [Convex Resend Component](https://www.convex.dev/components/resend)

### Design References

- [Resend Email Examples](https://react.email/examples)
- [Really Good Emails](https://reallygoodemails.com/) - Email design inspiration
- [Email on Acid](https://www.emailonacid.com/) - Email testing

### Security References

- [OWASP Email Security](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

---

## 🎯 Definition of Done

This issue is complete when:

- [x] All Phase 1-5 tasks completed and tested
- [x] All email templates professional and branded
- [x] Email verification enforced for new users
- [x] Password reset works end-to-end
- [x] Magic link authentication available
- [x] All edge cases handled gracefully
- [x] All tests passing (unit, integration, e2e)
- [x] Accessibility audit passed (WCAG 2.1 AA)
- [x] Security audit passed
- [x] Documentation updated
- [x] Linear issue updated with final status
- [x] Deployed to production
- [x] Monitored for 48h with no major issues

---

## ✍️ Notes & Decisions

### Decision Log

**2025-01-XX:** Chose Resend over SendGrid for simpler API and better Convex integration.

**2025-01-XX:** Set magic link expiration to 15 minutes (balance between security and UX).

**2025-01-XX:** Decided to allow sign-up via magic link (not just sign-in) for better UX.

### Open Questions

- [ ] Should we add SMS verification as backup?
- [ ] Should magic links work multiple times within expiration window, or one-time only? (Decision: one-time)
- [ ] Should we track email open rates? (Nice to have, not MVP)

---

**Last Updated:** 2025-01-10
**Author:** Claude Code
**Reviewers:** TBD
