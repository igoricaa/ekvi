# Environment Variables Setup

## Required Services

### 1. Convex
- Sign up: https://convex.dev
- Create project
- Copy deployment URL

### 2. Mux (for video)
- Sign up: https://mux.com
- Get API tokens
- Get environment key

### 3. Cloudflare R2 (for file storage)
- Sign up: https://cloudflare.com
- Create R2 bucket
- Generate API keys

### 4. Resend (for email)
- Sign up: https://resend.com
- Get API key

### 5. Lemon Squeezy (for payments)
- Sign up: https://lemonsqueezy.com
- Get API key
- Set up webhook

## Setup Steps

1. Copy `.env.example` to `.env.local`
2. Fill in all values
3. Never commit `.env.local`
4. For production, set in Vercel dashboard