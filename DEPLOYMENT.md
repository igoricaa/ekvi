# EKVI Deployment Guide

This guide covers deploying EKVI to production using Vercel (frontend) and Convex Cloud (backend).

## Architecture Overview

EKVI uses a **two-deployment architecture**:

1. **Vercel** → Hosts the Next.js frontend (`apps/web`)
2. **Convex Cloud** → Hosts the serverless backend (`packages/backend`)

This is the correct approach because:
- Convex is a fully managed backend platform
- It runs on its own infrastructure with built-in database, real-time queries, and serverless functions
- Your Next.js app is a client that connects to Convex via API
- Backend secrets (API keys) stay secure in Convex, never exposed to the browser

```
┌─────────────────┐         HTTPS/WebSocket         ┌──────────────────┐
│                 │ ──────────────────────────────> │                  │
│  Vercel         │                                 │  Convex Cloud    │
│  (Next.js App)  │ <────────────────────────────── │  (Backend)       │
│                 │         Real-time Updates       │                  │
└─────────────────┘                                 └──────────────────┘
      │                                                      │
      │                                                      │
      ↓                                                      ↓
  Users' Browsers                                   Database, Storage,
  (Static + Client JS)                              Webhooks, Cron Jobs
```

---

## Part 1: Convex Backend Deployment

Deploy the backend **first** to get the production Convex URL.

### Step 1: Deploy Convex Functions

From the root or `packages/backend` directory:

```bash
npx convex deploy
```

**What happens:**
1. CLI prompts you to confirm production deployment
2. Uploads functions, schema, and configuration to Convex Cloud
3. Runs database migrations if needed
4. Returns production deployment URL: `https://your-production.convex.cloud`

**Note the production URL** - you'll need it for Vercel environment variables.

### Step 2: Configure Convex Environment Variables

Go to [Convex Dashboard](https://dashboard.convex.dev) → Your Project → Settings → Environment Variables

Add the following **backend secrets**:

#### Mux (Video Platform)
```bash
MUX_TOKEN_ID=your-production-mux-token-id
MUX_TOKEN_SECRET=your-production-mux-token-secret
```

Get these from [Mux Dashboard](https://dashboard.mux.com) → Settings → Access Tokens

#### Cloudflare R2 (File Storage)
```bash
R2_ACCESS_KEY_ID=your-production-r2-access-key
R2_SECRET_ACCESS_KEY=your-production-r2-secret-key
R2_BUCKET=ekvi-prod
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
```

Create production bucket and credentials in [Cloudflare Dashboard](https://dash.cloudflare.com) → R2

#### Resend (Email)
```bash
RESEND_API_KEY=your-production-resend-api-key
```

Get from [Resend Dashboard](https://resend.com/api-keys)

#### Lemon Squeezy (Payments)
```bash
LEMON_SQUEEZY_API_KEY=your-production-lemon-squeezy-api-key
LEMON_SQUEEZY_WEBHOOK_SECRET=your-production-webhook-secret
```

Get from [Lemon Squeezy Dashboard](https://app.lemonsqueezy.com)

**Important:**
- These are **server-side secrets** - never add them to Vercel
- Convex automatically injects them into your backend functions via `process.env`
- They are never exposed to the browser

### Step 3: Configure Webhooks

After deployment, configure webhook URLs in external services:

#### Mux Webhooks
- URL: `https://your-production.convex.cloud/mux-webhook`
- Add to Mux Dashboard → Settings → Webhooks

#### Lemon Squeezy Webhooks
- URL: `https://your-production.convex.cloud/lemon-squeezy-webhook`
- Add to Lemon Squeezy Dashboard → Settings → Webhooks

---

## Part 2: Vercel Frontend Deployment

### Step 1: Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. **Do not deploy yet** - configure settings first

### Step 2: Configure Build Settings

In the project configuration screen:

**Framework Preset:** Next.js (auto-detected)

**Root Directory:** `apps/web` ⚠️ **Critical setting**
- Click "Edit" next to Root Directory
- Select `apps/web`
- This tells Vercel where your Next.js app lives in the monorepo

**Build Command:** Leave empty (uses default `next build`)

**Install Command:** Leave empty (auto-detects `pnpm install`)

**Output Directory:** `.next` (relative to root directory)

**Node.js Version:** 20.x or 22.x

### Step 3: Configure Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables for **Production**, **Preview**, and **Development** environments:

#### Convex Connection (Required)
```bash
NEXT_PUBLIC_CONVEX_URL=https://your-production.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-production.convex.site
```

**Important:** These are **two different URLs**:
- `.convex.cloud` - Your Convex backend API endpoint
- `.convex.site` - Your Convex authentication endpoint (used by `nextJsHandler`)
- Replace `your-production` with your actual deployment name from Convex dashboard

#### Client-Side URLs (Required)
```bash
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

Used in browser code for redirects and OAuth callbacks.

For initial deployment, you can use Vercel's auto-generated domain:
- `NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app`
- Update to custom domain later

#### Node.js Environment
```bash
NODE_ENV=production
```

### Step 4: Deploy

Click "Deploy" - Vercel will:
1. Install dependencies with pnpm
2. Build the Next.js app from `apps/web`
3. Deploy to global CDN
4. Provide a production URL

---

## Environment Variables Reference

### Quick Summary

**Vercel (4 variables):**
- `NEXT_PUBLIC_CONVEX_URL` - Your Convex API endpoint (`.convex.cloud`)
- `NEXT_PUBLIC_CONVEX_SITE_URL` - Your Convex auth endpoint (`.convex.site`)
- `NEXT_PUBLIC_SITE_URL` - Your app domain (for client-side redirects)
- `NEXT_PUBLIC_APP_URL` - Your app domain (for client-side configuration)
- `NODE_ENV=production`

**Convex (10+ variables):**
- Auth: `BETTER_AUTH_SECRET`, `SITE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Mux: `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_WEBHOOK_SIGNING_SECRET`
- Optional Mux: `MUX_SIGNING_KEY_ID`, `MUX_SIGNING_PRIVATE_KEY`
- R2: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`
- Email: `RESEND_API_KEY`
- Payments: `LEMON_SQUEEZY_API_KEY`, `LEMON_SQUEEZY_WEBHOOK_SECRET`

### Architecture Overview

**Important:** EKVI uses `@convex-dev/better-auth` which means:
- Your Next.js API route (`app/api/auth/[...all]/route.ts`) is a **simple proxy**
- ALL authentication logic runs in **Convex backend**
- OAuth, secrets, and configuration live in `packages/backend/convex/auth.ts`
- The proxy just forwards requests between your frontend and Convex

## First-Time Setup Checklist

Follow these steps in order:

### 1. Prepare Production Credentials
- [ ] Create production Mux account and get tokens
- [ ] Create production R2 bucket and access keys
- [ ] Create production Resend API key
- [ ] Create production Lemon Squeezy account and API key
- [ ] Generate new `BETTER_AUTH_SECRET` for production

### 2. Deploy Convex Backend
- [ ] Run `npx convex deploy` from root
- [ ] Note the production Convex URL
- [ ] Add backend secrets to Convex dashboard
- [ ] Configure webhook URLs (Mux, Lemon Squeezy)
- [ ] Test Convex functions work (check dashboard logs)

### 3. Configure Vercel Project
- [ ] Create Vercel project from GitHub repo
- [ ] Set Root Directory to `apps/web`
- [ ] Add all frontend environment variables
- [ ] Verify Node.js version is 20.x or 22.x

### 4. Initial Deployment
- [ ] Deploy to Vercel
- [ ] Test the deployed site works
- [ ] Check browser console for errors
- [ ] Verify Convex connection (real-time queries work)

### 5. Domain & OAuth Setup
- [ ] Add custom domain in Vercel settings
- [ ] Update `SITE_URL` in Convex (server-side)
- [ ] Update `NEXT_PUBLIC_SITE_URL` in Vercel (client-side)
- [ ] Configure Google OAuth redirect URIs in Google Cloud Console
- [ ] Update Mux/Lemon Squeezy webhook URLs if domain changed

### 6. Post-Deployment Testing
- [ ] Test user authentication (sign up, login, logout)
- [ ] Test video upload and playback
- [ ] Test file uploads (if implemented)
- [ ] Test email sending (if implemented)
- [ ] Check Convex dashboard logs for errors

---

## Ongoing Deployment Workflow

### Deploying Backend Changes

**Option 1: Manual Deployment**

From the root or `packages/backend` directory:

```bash
npx convex deploy
```

This deploys your functions, schema, and configuration to production.

**Option 2: Automated Deployment with GitHub Actions (Recommended)**

Convex does not have built-in GitHub integration. Instead, set up GitHub Actions to automatically deploy on push:

1. **Create a Deploy Key**

   Go to [Convex Dashboard](https://dashboard.convex.dev) → Your Project → Settings → Deploy Keys → Create Deploy Key

   Copy the generated key (starts with `prod:...`)

2. **Add GitHub Secret**

   In your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

   - Name: `CONVEX_DEPLOY_KEY`
   - Value: Your deploy key from step 1

3. **Create Workflow File**

   Create `.github/workflows/convex-deploy.yml`:

   ```yaml
   name: Deploy Convex Backend

   on:
     push:
       branches: [main]

   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4

         - name: Set up Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20.x'

         - name: Install pnpm
           uses: pnpm/action-setup@v2
           with:
             version: 8

         - name: Install dependencies
           run: pnpm install

         - name: Deploy to Convex
           env:
             CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}
           run: npx convex deploy
   ```

   Now every push to `main` automatically deploys your Convex backend.

**Schema Changes:**
- Convex enforces schema compatibility with existing data
- Test migrations in dev environment first
- Use schema validation in `packages/backend/convex/schema.ts`
