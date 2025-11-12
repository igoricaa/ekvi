# TESTING ROADMAP

**Last Updated:** 2025-01-12
**Status:** All Tests Passing ✅ (64 backend + 9 frontend)

---

## Table of Contents

1. [Current State](#current-state)
2. [Cron Testing Pattern](#cron-testing-pattern)
3. [Phase 1: Backend Testing Expansion](#phase-1-backend-testing-expansion)
4. [Phase 2: Frontend MSW Setup](#phase-2-frontend-msw-setup)
5. [Phase 3: Integration Tests](#phase-3-integration-tests)
6. [Implementation Checklist](#implementation-checklist)

---

## Current State

### ✅ What's Working

**Backend Tests (64 passing):**
- `packages/backend/convex/__tests__/auth.test.ts` (18 tests)
  - User creation with Better Auth
  - Profile creation (athlete/coach)
  - Session management
  - Onboarding flow
  - Authentication and authorization
- `packages/backend/convex/__tests__/videos.test.ts` (39 tests)
  - Video CRUD operations
  - Mux integration
  - Upload workflows
  - Authorization checks
- `packages/backend/convex/__tests__/users.test.ts` (7 tests)
  - User profile management
  - Session queries
  - Account operations

**Frontend Tests (9 passing):**
- `apps/web/__tests__/lib/example.test.ts`
  - Basic Vitest validation
  - Async/await patterns
  - Test infrastructure verification

### 🏗️ Testing Infrastructure

**Configuration Files:**
- `vitest.workspace.ts` - Root workspace config (Vitest 4 projects pattern)
- `apps/web/vitest.config.ts` - Frontend config (jsdom, RTL)
- `packages/backend/vitest.config.ts` - Backend config (edge-runtime, convex-test)
- `packages/backend/vitest.setup.ts` - Global setup (error handlers, Node.js APIs allowed)

**Key Test Utilities:**
- `packages/backend/convex/test.setup.ts` - Convex test helper factory
- `packages/backend/convex/__tests__/setup.ts` - Convex-specific utilities (V8-safe)
- `packages/backend/convex/__tests__/helpers.ts` - Auth test helpers
- `apps/web/vitest.setup.ts` - RTL setup with jest-dom matchers

**Test Pattern (Proven):**
```typescript
import { setupConvexTest } from "../test.setup";
import { createAuthenticatedTestUser } from "./helpers";
import { api } from "../_generated/api";

describe("Feature Tests", () => {
  it("should perform action", async () => {
    const t = setupConvexTest();
    const { asUser, userId } = await createAuthenticatedTestUser(t, {
      email: "test@example.com",
      name: "Test User",
    });

    const result = await asUser.mutation(api.feature.action, {
      // args
    });

    expect(result).toBeDefined();
  });
});
```

---

## Cron Testing Pattern

### Problem

convex-test doesn't support cron job schedulers. When `crons.ts` registers cron jobs during test module loading, it attempts to write to the `_scheduled_functions` table, causing "Write outside of transaction" errors.

### Solution: File Separation by Deployment Context

**Key Principle:** Files inside `convex/` directory are compiled and deployed to Convex (V8 isolate runtime). Files at backend root are never deployed.

**File Structure:**
```
packages/backend/
├── vitest.setup.ts              # Global setup (Node.js APIs allowed, not deployed)
└── convex/
    ├── crons.ts                 # Cron registrations (automatically loaded by Convex)
    └── __tests__/
        └── setup.ts             # Convex utilities (deployed, must be V8-safe)
```

### Implementation

**1. vitest.setup.ts** (backend root) - Suppress expected errors:
```typescript
/**
 * Global test setup - runs BEFORE all tests
 * Safe to use Node.js APIs (process, fs, etc.) here
 */
process.on("unhandledRejection", (reason: unknown) => {
  const error = reason as Error;

  // Suppress scheduler errors from crons.ts
  if (
    error?.message?.includes("Write outside of transaction") &&
    error?.message?.includes("_scheduled_functions")
  ) {
    return; // Expected - convex-test doesn't support schedulers
  }

  throw reason; // Re-throw all other errors
});
```

**2. vitest.config.ts** - Use both setup files:
```typescript
export default defineConfig({
  test: {
    setupFiles: [
      "./vitest.setup.ts",           // Global (error handlers)
      "./convex/__tests__/setup.ts"  // Convex-specific utilities
    ],
  }
});
```

**3. Test cron functions directly**:
```typescript
// ❌ Don't test cron registration
// crons.daily("cleanup", { hourUTC: 4 }, internal.cleanup);

// ✅ Test the underlying mutation
describe("Cron Jobs", () => {
  it("should cleanup abandoned uploads", async () => {
    const t = setupConvexTest();

    // Call the mutation directly
    await t.mutation(internal.mux.mutations.cleanupAbandonedUploads);

    // Assert cleanup happened
    const videos = await t.run(async (ctx) => {
      return await ctx.db.query("videos").collect();
    });

    expect(videos.filter(v => v.status === "abandoned")).toHaveLength(0);
  });
});
```

### Why This Works

- **V8 Isolate Restriction:** Convex functions run in V8 isolates, not Node.js - no access to `process.on()`
- **Deployment Scope:** Only files in `convex/` directory are deployed to Convex
- **Test Separation:** Error handlers stay in vitest.setup.ts (outside convex/), never deployed
- **Cron Testing Strategy:** Test business logic (the mutation), not cron registration

### Key Takeaway

**Keep Node.js APIs (process, fs, etc.) in files outside `convex/` directory. Files inside `convex/` must be V8 isolate-compatible.**

---

## Phase 1: Backend Testing Expansion

**Goal:** Comprehensive test coverage for all Convex backend functions
**MSW Required:** ❌ No (convex-test handles database mocking)

### 1.1 Video Operations

**File:** `packages/backend/convex/videos.ts`

#### Test Cases

**Create Video:**
```typescript
describe("videos.create", () => {
  it("should create video with Mux upload URL", async () => {
    const t = setupConvexTest();
    const { asUser } = await createAuthenticatedTestUser(t, {
      email: "coach@example.com",
      name: "Coach Test",
    });

    const videoId = await asUser.mutation(api.videos.create, {
      title: "Training Session 1",
      description: "Warm-up exercises",
      category: "fitness",
    });

    expect(videoId).toBeDefined();

    // Verify video was created with correct data
    const video = await asUser.query(api.videos.getById, { id: videoId });
    expect(video.title).toBe("Training Session 1");
    expect(video.uploadStatus).toBe("pending");
  });

  it("should reject video creation without authentication", async () => {
    const t = setupConvexTest();

    await expect(
      t.mutation(api.videos.create, {
        title: "Unauthorized Video",
      })
    ).rejects.toThrow("Unauthenticated");
  });

  it("should validate required fields", async () => {
    const t = setupConvexTest();
    const { asUser } = await createAuthenticatedTestUser(t, {
      email: "coach@example.com",
      name: "Coach Test",
    });

    await expect(
      asUser.mutation(api.videos.create, {
        // Missing title
        description: "Missing title",
      })
    ).rejects.toThrow();
  });
});
```

**Update Video:**
```typescript
describe("videos.update", () => {
  it("should update video metadata", async () => {
    const t = setupConvexTest();
    const { asUser, userId } = await createAuthenticatedTestUser(t, {
      email: "coach@example.com",
      name: "Coach Test",
    });

    // Create video first
    const videoId = await asUser.mutation(api.videos.create, {
      title: "Original Title",
      description: "Original description",
    });

    // Update video
    await asUser.mutation(api.videos.update, {
      id: videoId,
      title: "Updated Title",
      description: "Updated description",
    });

    // Verify update
    const video = await asUser.query(api.videos.getById, { id: videoId });
    expect(video.title).toBe("Updated Title");
    expect(video.description).toBe("Updated description");
  });

  it("should prevent unauthorized updates", async () => {
    const t = setupConvexTest();

    // Create video as coach1
    const { asUser: coach1 } = await createAuthenticatedTestUser(t, {
      email: "coach1@example.com",
      name: "Coach One",
    });
    const videoId = await coach1.mutation(api.videos.create, {
      title: "Coach 1 Video",
    });

    // Try to update as coach2
    const { asUser: coach2 } = await createAuthenticatedTestUser(t, {
      email: "coach2@example.com",
      name: "Coach Two",
    });

    await expect(
      coach2.mutation(api.videos.update, {
        id: videoId,
        title: "Hacked Title",
      })
    ).rejects.toThrow("Unauthorized");
  });
});
```

**Delete Video:**
```typescript
describe("videos.delete", () => {
  it("should delete video and cleanup Mux asset", async () => {
    const t = setupConvexTest();
    const { asUser } = await createAuthenticatedTestUser(t, {
      email: "coach@example.com",
      name: "Coach Test",
    });

    const videoId = await asUser.mutation(api.videos.create, {
      title: "Video to Delete",
    });

    await asUser.mutation(api.videos.delete, { id: videoId });

    // Verify video is deleted
    const video = await asUser.query(api.videos.getById, { id: videoId });
    expect(video).toBeNull();
  });
});
```

**List and Filter Videos:**
```typescript
describe("videos.list", () => {
  it("should list videos by coach", async () => {
    const t = setupConvexTest();
    const { asUser, userId } = await createAuthenticatedTestUser(t, {
      email: "coach@example.com",
      name: "Coach Test",
    });

    // Create multiple videos
    await asUser.mutation(api.videos.create, { title: "Video 1" });
    await asUser.mutation(api.videos.create, { title: "Video 2" });
    await asUser.mutation(api.videos.create, { title: "Video 3" });

    const videos = await asUser.query(api.videos.listByCoach, {
      coachId: userId,
    });

    expect(videos).toHaveLength(3);
  });

  it("should filter videos by category", async () => {
    const t = setupConvexTest();
    const { asUser } = await createAuthenticatedTestUser(t, {
      email: "coach@example.com",
      name: "Coach Test",
    });

    await asUser.mutation(api.videos.create, {
      title: "Fitness Video",
      category: "fitness",
    });
    await asUser.mutation(api.videos.create, {
      title: "Nutrition Video",
      category: "nutrition",
    });

    const fitnessVideos = await asUser.query(api.videos.list, {
      category: "fitness",
    });

    expect(fitnessVideos).toHaveLength(1);
    expect(fitnessVideos[0].title).toBe("Fitness Video");
  });
});
```

### 1.2 Coach Profile Management

**File:** `packages/backend/convex/profiles.ts`

#### Test Cases

**Create Coach Profile:**
```typescript
describe("profiles.createCoach", () => {
  it("should create coach profile with specializations", async () => {
    const t = setupConvexTest();
    const { asUser } = await createAuthenticatedTestUser(t, {
      email: "coach@example.com",
      name: "Coach Test",
    });

    const profileId = await asUser.mutation(api.profiles.create, {
      displayName: "Coach Test",
      role: "coach",
      specializations: ["fitness", "nutrition"],
      hourlyRate: 50,
      bio: "Experienced fitness coach",
    });

    expect(profileId).toBeDefined();

    const profile = await asUser.query(api.profiles.getById, {
      id: profileId,
    });

    expect(profile.role).toBe("coach");
    expect(profile.specializations).toContain("fitness");
    expect(profile.hourlyRate).toBe(50);
  });

  it("should mark user onboarding as complete", async () => {
    const t = setupConvexTest();
    const { asUser, userId } = await createAuthenticatedTestUser(t, {
      email: "coach@example.com",
      name: "Coach Test",
      hasCompletedOnboarding: false,
    });

    await asUser.mutation(api.profiles.create, {
      displayName: "Coach Test",
      role: "coach",
    });

    // Verify onboarding flag updated
    const result = await t.run(async (ctx) => {
      return await ctx.runQuery(components.betterAuth.adapter.findOne, {
        input: {
          model: "user",
          where: [{ field: "_id", value: userId }],
        },
      });
    });

    expect(result.hasCompletedOnboarding).toBe(true);
  });
});
```

**Update Coach Availability:**
```typescript
describe("profiles.updateAvailability", () => {
  it("should update coach availability schedule", async () => {
    const t = setupConvexTest();
    const { asUser } = await createAuthenticatedTestUser(t, {
      email: "coach@example.com",
      name: "Coach Test",
    });

    const profileId = await asUser.mutation(api.profiles.create, {
      displayName: "Coach Test",
      role: "coach",
    });

    await asUser.mutation(api.profiles.updateAvailability, {
      profileId,
      availability: {
        monday: { start: "09:00", end: "17:00" },
        tuesday: { start: "09:00", end: "17:00" },
      },
    });

    const profile = await asUser.query(api.profiles.getById, {
      id: profileId,
    });

    expect(profile.availability.monday.start).toBe("09:00");
  });
});
```

**List Coaches with Filters:**
```typescript
describe("profiles.listCoaches", () => {
  it("should list all coaches", async () => {
    const t = setupConvexTest();

    // Create multiple coaches
    const { asUser: coach1 } = await createAuthenticatedTestUser(t, {
      email: "coach1@example.com",
      name: "Coach One",
    });
    await coach1.mutation(api.profiles.create, {
      displayName: "Coach One",
      role: "coach",
    });

    const { asUser: coach2 } = await createAuthenticatedTestUser(t, {
      email: "coach2@example.com",
      name: "Coach Two",
    });
    await coach2.mutation(api.profiles.create, {
      displayName: "Coach Two",
      role: "coach",
    });

    const coaches = await t.query(api.profiles.listCoaches);
    expect(coaches).toHaveLength(2);
  });

  it("should filter coaches by specialization", async () => {
    const t = setupConvexTest();

    const { asUser: fitnessCoach } = await createAuthenticatedTestUser(t, {
      email: "fitness@example.com",
      name: "Fitness Coach",
    });
    await fitnessCoach.mutation(api.profiles.create, {
      displayName: "Fitness Coach",
      role: "coach",
      specializations: ["fitness"],
    });

    const { asUser: nutritionCoach } = await createAuthenticatedTestUser(t, {
      email: "nutrition@example.com",
      name: "Nutrition Coach",
    });
    await nutritionCoach.mutation(api.profiles.create, {
      displayName: "Nutrition Coach",
      role: "coach",
      specializations: ["nutrition"],
    });

    const fitnessCoaches = await t.query(api.profiles.listCoaches, {
      specialization: "fitness",
    });

    expect(fitnessCoaches).toHaveLength(1);
    expect(fitnessCoaches[0].displayName).toBe("Fitness Coach");
  });
});
```

### 1.3 User Operations

**File:** `packages/backend/convex/users.ts`

#### Test Cases

**Get User by ID:**
```typescript
describe("users.getById", () => {
  it("should retrieve user by ID", async () => {
    const t = setupConvexTest();
    const { asUser, userId } = await createAuthenticatedTestUser(t, {
      email: "user@example.com",
      name: "Test User",
    });

    const user = await asUser.query(api.users.getById, { id: userId });

    expect(user.email).toBe("user@example.com");
    expect(user.name).toBe("Test User");
  });

  it("should return null for non-existent user", async () => {
    const t = setupConvexTest();
    const { asUser } = await createAuthenticatedTestUser(t, {
      email: "user@example.com",
      name: "Test User",
    });

    const user = await asUser.query(api.users.getById, {
      id: "non-existent-id" as any,
    });

    expect(user).toBeNull();
  });
});
```

**Update User Settings:**
```typescript
describe("users.updateSettings", () => {
  it("should update user preferences", async () => {
    const t = setupConvexTest();
    const { asUser, userId } = await createAuthenticatedTestUser(t, {
      email: "user@example.com",
      name: "Test User",
    });

    await asUser.mutation(api.users.updateSettings, {
      emailNotifications: false,
      language: "es",
    });

    const user = await asUser.query(api.users.getById, { id: userId });
    expect(user.emailNotifications).toBe(false);
    expect(user.language).toBe("es");
  });
});
```

**Delete User (Cascade):**
```typescript
describe("users.delete", () => {
  it("should delete user and cascade to profile", async () => {
    const t = setupConvexTest();
    const { asUser, userId } = await createAuthenticatedTestUser(t, {
      email: "user@example.com",
      name: "Test User",
    });

    // Create profile
    const profileId = await asUser.mutation(api.profiles.create, {
      displayName: "Test Profile",
      role: "athlete",
    });

    // Delete user
    await asUser.mutation(api.users.delete, { id: userId });

    // Verify user deleted
    const user = await t.run(async (ctx) => {
      return await ctx.runQuery(components.betterAuth.adapter.findOne, {
        input: {
          model: "user",
          where: [{ field: "_id", value: userId }],
        },
      });
    });
    expect(user).toBeNull();

    // Verify profile deleted
    const profile = await t.query(api.profiles.getById, { id: profileId });
    expect(profile).toBeNull();
  });
});
```

### 1.4 Edge Cases and Error Scenarios

**Duplicate Email Handling:**
```typescript
describe("auth edge cases", () => {
  it("should prevent duplicate email registration", async () => {
    const t = setupConvexTest();

    // Create first user
    await createAuthenticatedTestUser(t, {
      email: "duplicate@example.com",
      name: "User One",
    });

    // Try to create second user with same email
    await expect(
      createAuthenticatedTestUser(t, {
        email: "duplicate@example.com",
        name: "User Two",
      })
    ).rejects.toThrow();
  });
});
```

**Invalid Data Validation:**
```typescript
describe("validation", () => {
  it("should reject invalid email format", async () => {
    const t = setupConvexTest();

    await expect(
      createAuthenticatedTestUser(t, {
        email: "not-an-email",
        name: "Test User",
      })
    ).rejects.toThrow();
  });

  it("should reject negative hourly rate for coaches", async () => {
    const t = setupConvexTest();
    const { asUser } = await createAuthenticatedTestUser(t, {
      email: "coach@example.com",
      name: "Coach Test",
    });

    await expect(
      asUser.mutation(api.profiles.create, {
        displayName: "Coach Test",
        role: "coach",
        hourlyRate: -50, // Invalid
      })
    ).rejects.toThrow();
  });
});
```

### 1.5 Test Organization

**File Structure:**
```
packages/backend/convex/__tests__/
├── auth.test.ts                 ✅ (existing, 18 tests)
├── videos.test.ts               📝 (to create)
├── profiles.test.ts             📝 (to create)
├── users.test.ts                📝 (to create)
├── notifications.test.ts        📝 (future)
├── payments.test.ts             📝 (future)
├── helpers.ts                   ✅ (existing)
└── setup.ts                     ✅ (existing)
```

**Run Commands:**
```bash
# Run all backend tests
pnpm --filter backend test

# Run specific test file
pnpm --filter backend test -- videos.test.ts

# Run with verbose output
pnpm --filter backend test -- --reporter=verbose

# Run specific test
pnpm --filter backend test -- videos.test.ts -t "should create video"
```

---

## Phase 2: Frontend MSW Setup

**Goal:** Mock external API calls in frontend component tests
**MSW Required:** ✅ Yes (for Mux, Resend, Google OAuth)
**When to Implement:** When you build components that call external APIs

### 2.1 When MSW Is Needed

**Use MSW for:**
- ✅ Testing components that upload to Mux
- ✅ Testing components that send emails via Resend
- ✅ Testing Google OAuth login flow
- ✅ Testing Stripe payment flows
- ✅ Testing any external HTTP API calls

**Don't Use MSW for:**
- ❌ Testing Convex queries/mutations (use convex-test)
- ❌ Testing pure utility functions
- ❌ Testing component rendering (use RTL only)

### 2.2 Installation

```bash
# Install MSW in web app
pnpm add -D msw --filter web

# Initialize MSW (generates service worker for browser)
cd apps/web
npx msw init public/
```

### 2.3 File Structure

```
apps/web/__tests__/
├── mocks/
│   ├── handlers.ts              📝 (to create)
│   └── server.ts                📝 (to create)
├── components/
│   └── VideoUpload.test.tsx     📝 (future)
└── lib/
    └── example.test.ts          ✅ (existing)
```

### 2.4 Implementation

#### 2.4.1 Create Handlers (`apps/web/__tests__/mocks/handlers.ts`)

```typescript
import { http, HttpResponse } from 'msw';

/**
 * MSW Request Handlers
 *
 * Mock external API responses for testing:
 * - Mux Video API (uploads, assets)
 * - Resend Email API
 * - Google OAuth API
 * - Stripe Payment API
 */

export const handlers = [
  // ============================================
  // Mux API Handlers
  // ============================================

  // Create upload URL
  http.post('https://api.mux.com/video/v1/uploads', () => {
    return HttpResponse.json({
      data: {
        id: 'mock-upload-id-123',
        url: 'https://storage.googleapis.com/mock-mux-upload/123',
        status: 'waiting',
        timeout: 3600,
        cors_origin: '*',
      },
    });
  }),

  // Get upload status
  http.get('https://api.mux.com/video/v1/uploads/:uploadId', ({ params }) => {
    return HttpResponse.json({
      data: {
        id: params.uploadId,
        status: 'asset_created',
        asset_id: 'mock-asset-id-456',
      },
    });
  }),

  // Get asset details
  http.get('https://api.mux.com/video/v1/assets/:assetId', ({ params }) => {
    return HttpResponse.json({
      data: {
        id: params.assetId,
        status: 'ready',
        duration: 120.5,
        playback_ids: [
          {
            id: 'mock-playback-id-789',
            policy: 'public',
          },
        ],
      },
    });
  }),

  // Delete asset
  http.delete('https://api.mux.com/video/v1/assets/:assetId', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // ============================================
  // Resend API Handlers
  // ============================================

  // Send email
  http.post('https://api.resend.com/emails', async ({ request }) => {
    const body = await request.json();

    return HttpResponse.json({
      id: 'mock-email-id-abc',
      from: body.from,
      to: body.to,
      created_at: new Date().toISOString(),
    });
  }),

  // Get email status
  http.get('https://api.resend.com/emails/:emailId', ({ params }) => {
    return HttpResponse.json({
      id: params.emailId,
      status: 'delivered',
      last_event: 'delivered',
    });
  }),

  // ============================================
  // Google OAuth API Handlers
  // ============================================

  // Exchange auth code for tokens
  http.post('https://oauth2.googleapis.com/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token-xyz',
      refresh_token: 'mock-refresh-token-xyz',
      expires_in: 3600,
      token_type: 'Bearer',
      id_token: 'mock-id-token-xyz',
    });
  }),

  // Get user info
  http.get('https://www.googleapis.com/oauth2/v2/userinfo', () => {
    return HttpResponse.json({
      id: 'mock-google-user-id',
      email: 'test@gmail.com',
      verified_email: true,
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
    });
  }),

  // ============================================
  // Stripe API Handlers (Future)
  // ============================================

  // Create checkout session
  http.post('https://api.stripe.com/v1/checkout/sessions', () => {
    return HttpResponse.json({
      id: 'mock-session-id',
      url: 'https://checkout.stripe.com/pay/mock-session',
      status: 'open',
    });
  }),
];

/**
 * Error Handlers (for testing error scenarios)
 */
export const errorHandlers = {
  muxUploadError: http.post('https://api.mux.com/video/v1/uploads', () => {
    return HttpResponse.json(
      { error: { type: 'invalid_request', message: 'Upload failed' } },
      { status: 400 }
    );
  }),

  resendEmailError: http.post('https://api.resend.com/emails', () => {
    return HttpResponse.json(
      { error: { message: 'Invalid API key' } },
      { status: 401 }
    );
  }),

  googleOAuthError: http.post('https://oauth2.googleapis.com/token', () => {
    return HttpResponse.json(
      { error: 'invalid_grant', error_description: 'Invalid authorization code' },
      { status: 400 }
    );
  }),
};
```

#### 2.4.2 Create Server Setup (`apps/web/__tests__/mocks/server.ts`)

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW Server for Node.js Tests
 *
 * This server intercepts network requests during tests
 * and returns mocked responses defined in handlers.ts
 */
export const server = setupServer(...handlers);
```

#### 2.4.3 Integrate into Vitest Setup (`apps/web/vitest.setup.ts`)

```typescript
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, afterAll } from "vitest";
import { server } from "./__tests__/mocks/server";

/**
 * Vitest Setup for Web App Testing
 *
 * This file runs before each test file in the web app.
 *
 * Setup:
 * - Imports @testing-library/jest-dom for custom matchers FIRST
 * - Configures automatic cleanup after each test
 * - Starts MSW server to mock external API calls
 */

// Start MSW server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn', // Warn about unhandled requests
  });
});

// Cleanup after each test
afterEach(() => {
  cleanup(); // Clean up React components
  server.resetHandlers(); // Reset MSW handlers to default
});

// Close MSW server after all tests
afterAll(() => {
  server.close();
});
```

### 2.5 Testing Patterns with MSW

#### 2.5.1 Basic Component Test with Mocked API

```typescript
// apps/web/__tests__/components/VideoUpload.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { VideoUpload } from '@/components/VideoUpload';

describe('VideoUpload Component', () => {
  it('should upload video to Mux', async () => {
    const user = userEvent.setup();

    render(<VideoUpload />);

    // Select file
    const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
    const input = screen.getByLabelText('Upload Video');
    await user.upload(input, file);

    // Click upload button
    const uploadButton = screen.getByRole('button', { name: 'Upload' });
    await user.click(uploadButton);

    // Wait for upload to complete (mocked by MSW)
    await waitFor(() => {
      expect(screen.getByText('Upload successful')).toBeInTheDocument();
    });
  });
});
```

#### 2.5.2 Test with Custom Handler (Error Scenario)

```typescript
import { server } from '../mocks/server';
import { errorHandlers } from '../mocks/handlers';

describe('VideoUpload Error Handling', () => {
  it('should display error when upload fails', async () => {
    // Override default handler with error handler
    server.use(errorHandlers.muxUploadError);

    const user = userEvent.setup();
    render(<VideoUpload />);

    const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
    const input = screen.getByLabelText('Upload Video');
    await user.upload(input, file);

    const uploadButton = screen.getByRole('button', { name: 'Upload' });
    await user.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });
  });
});
```

#### 2.5.3 Test with Multiple API Calls

```typescript
describe('Email Verification Flow', () => {
  it('should send verification email and check status', async () => {
    const user = userEvent.setup();

    render(<EmailVerification email="test@example.com" />);

    // Click "Send Verification Email"
    const sendButton = screen.getByRole('button', { name: 'Send Email' });
    await user.click(sendButton);

    // MSW intercepts POST to Resend API
    await waitFor(() => {
      expect(screen.getByText('Email sent!')).toBeInTheDocument();
    });

    // Click "Check Status"
    const checkButton = screen.getByRole('button', { name: 'Check Status' });
    await user.click(checkButton);

    // MSW intercepts GET to Resend API
    await waitFor(() => {
      expect(screen.getByText('Status: delivered')).toBeInTheDocument();
    });
  });
});
```

### 2.6 Run Commands

```bash
# Run all frontend tests with MSW
pnpm --filter web test

# Run specific component test
pnpm --filter web test -- VideoUpload.test.tsx

# Run with verbose output
pnpm --filter web test -- --reporter=verbose

# Run tests in UI mode (interactive)
pnpm --filter web test -- --ui
```

---

## Phase 3: Integration Tests

**Goal:** Test complete user flows with both frontend and backend
**MSW Required:** ✅ Yes (for external APIs in flows)
**When to Implement:** After Phase 1 and Phase 2 are complete

### 3.1 Integration Test Scenarios

**Scenario 1: Complete Video Upload Flow**
1. Coach logs in
2. Navigates to video upload page
3. Selects video file
4. Uploads to Mux (mocked)
5. Mux webhook triggers video processing (mocked)
6. Video appears in coach's library
7. Athlete searches for coach
8. Athlete views video

**Scenario 2: User Registration and Onboarding**
1. User visits signup page
2. Submits email/password
3. Receives verification email (mocked)
4. Clicks verification link
5. Completes profile (athlete/coach)
6. Sees dashboard

**Scenario 3: Coach Booking Flow**
1. Athlete searches for coaches
2. Filters by specialization/price
3. Views coach profile
4. Books session
5. Payment processed (mocked)
6. Confirmation email sent (mocked)
7. Session appears in both calendars

### 3.2 Integration Test Setup

#### 3.2.1 File Structure

```
apps/web/__tests__/integration/
├── video-upload-flow.test.tsx
├── user-registration-flow.test.tsx
├── coach-booking-flow.test.tsx
└── helpers/
    ├── test-providers.tsx        # Wrap components with providers
    └── integration-helpers.ts    # Shared integration utilities
```

#### 3.2.2 Test Providers Wrapper

```typescript
// apps/web/__tests__/integration/helpers/test-providers.tsx
import { ConvexProvider } from 'convex/react';
import { ConvexReactClient } from 'convex/react';
import { ReactNode } from 'react';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function TestProviders({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  );
}
```

#### 3.2.3 Example Integration Test

```typescript
// apps/web/__tests__/integration/video-upload-flow.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeAll } from 'vitest';
import { server } from '../mocks/server';
import { TestProviders } from './helpers/test-providers';
import { VideoUploadPage } from '@/app/(dashboard)/videos/upload/page';

describe('Video Upload Flow (Integration)', () => {
  beforeAll(() => {
    // Ensure MSW is running
    server.listen();
  });

  it('should complete full video upload and processing flow', async () => {
    const user = userEvent.setup();

    // 1. Render upload page with providers
    render(
      <TestProviders>
        <VideoUploadPage />
      </TestProviders>
    );

    // 2. Fill in video details
    await user.type(
      screen.getByLabelText('Title'),
      'Integration Test Video'
    );
    await user.type(
      screen.getByLabelText('Description'),
      'This is a test video'
    );

    // 3. Select file
    const file = new File(['video content'], 'test.mp4', {
      type: 'video/mp4',
    });
    const fileInput = screen.getByLabelText('Upload Video');
    await user.upload(fileInput, file);

    // 4. Submit form (triggers Mux upload - mocked by MSW)
    const submitButton = screen.getByRole('button', { name: 'Upload' });
    await user.click(submitButton);

    // 5. Wait for upload to complete
    await waitFor(
      () => {
        expect(screen.getByText('Upload successful!')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // 6. Verify video appears in Convex database
    // (This would query the actual Convex test instance)
    await waitFor(() => {
      expect(screen.getByText('Integration Test Video')).toBeInTheDocument();
    });

    // 7. Verify Mux playback ID is displayed
    expect(screen.getByTestId('video-player')).toHaveAttribute(
      'src',
      expect.stringContaining('mock-playback-id')
    );
  });

  it('should handle upload errors gracefully', async () => {
    const user = userEvent.setup();

    // Override handler to simulate error
    server.use(
      http.post('https://api.mux.com/video/v1/uploads', () => {
        return HttpResponse.json(
          { error: 'Upload failed' },
          { status: 500 }
        );
      })
    );

    render(
      <TestProviders>
        <VideoUploadPage />
      </TestProviders>
    );

    const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
    const input = screen.getByLabelText('Upload Video');
    await user.upload(input, file);

    const submitButton = screen.getByRole('button', { name: 'Upload' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
    });
  });
});
```

### 3.3 Integration Test Best Practices

**1. Use Real Convex Test Instance:**
```typescript
import { setupConvexTest } from '@convex/test.setup';

describe('Integration Test', () => {
  it('should persist data in Convex', async () => {
    const t = setupConvexTest();

    // Create test data in Convex
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', { name: 'Test User' });
    });

    // Render component that queries Convex
    render(
      <TestProviders>
        <UserProfile userId={userId} />
      </TestProviders>
    );

    // Assert data is displayed
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });
});
```

**2. Mock External APIs Only:**
```typescript
// Mock Mux, Resend, Google OAuth
// Don't mock Convex queries/mutations
server.use(
  http.post('https://api.mux.com/*', mockHandler),
  http.post('https://api.resend.com/*', mockHandler),
  // Don't mock localhost:3000 (Convex)
);
```

**3. Test Error Recovery:**
```typescript
it('should retry failed requests', async () => {
  let callCount = 0;

  server.use(
    http.post('https://api.mux.com/uploads', () => {
      callCount++;
      if (callCount === 1) {
        // First call fails
        return HttpResponse.json({ error: 'Timeout' }, { status: 504 });
      }
      // Second call succeeds
      return HttpResponse.json({ data: { id: 'success' } });
    })
  );

  // Test component retries and eventually succeeds
});
```

### 3.4 Run Commands

```bash
# Run all integration tests
pnpm --filter web test -- integration/

# Run specific integration test
pnpm --filter web test -- video-upload-flow.test.tsx

# Run with UI mode (recommended for debugging)
pnpm --filter web test -- --ui integration/
```

---

## Implementation Checklist

### ✅ Phase 0: Foundation (COMPLETE)
- [x] Vitest workspace setup
- [x] Backend test configuration (edge-runtime)
- [x] Frontend test configuration (jsdom + RTL)
- [x] Test setup file separation (vitest.setup.ts vs convex/__tests__/setup.ts)
- [x] Cron testing pattern (suppress scheduler errors, test mutations directly)
- [x] Better Auth test helpers
- [x] 64 passing backend tests (auth, videos, users)
- [x] 9 passing frontend example tests

### ✅ Phase 1: Backend Testing Expansion (COMPLETE)

**1.1 Video Tests (DONE)**
- [x] Created `packages/backend/convex/__tests__/videos.test.ts`
- [x] Video creation tests (39 tests total)
- [x] Video update tests
- [x] Video deletion tests
- [x] Video list/filter tests
- [x] Mux integration tests

**1.2 User Tests (DONE)**
- [x] Created `packages/backend/convex/__tests__/users.test.ts`
- [x] User retrieval tests (7 tests total)
- [x] User session tests
- [x] Profile management tests

**1.3 Auth Tests (DONE)**
- [x] Created `packages/backend/convex/__tests__/auth.test.ts`
- [x] User creation with Better Auth (18 tests total)
- [x] Profile creation (athlete/coach)
- [x] Session management
- [x] Authorization checks

**Success Criteria:**
- [x] All backend tests passing (64/64)
- [x] Coverage for core Convex functions
- [x] Authorization checks verified
- [x] Better Auth integration working

### 📝 Phase 2: Frontend MSW Setup (WHEN NEEDED)

**Trigger:** When you build components that call external APIs

**2.1 Installation**
- [ ] Run: `pnpm add -D msw --filter web`
- [ ] Run: `cd apps/web && npx msw init public/`

**2.2 File Creation**
- [ ] Create `apps/web/__tests__/mocks/handlers.ts` (copy from above)
- [ ] Create `apps/web/__tests__/mocks/server.ts` (copy from above)
- [ ] Update `apps/web/vitest.setup.ts` with MSW integration (copy from above)

**2.3 Verification**
- [ ] Run existing tests: `pnpm --filter web test`
- [ ] Verify no errors from MSW setup
- [ ] Check MSW logs for mocked requests

**2.4 First Component Test**
- [ ] Create first component test with MSW (e.g., VideoUpload)
- [ ] Verify mocked API calls work
- [ ] Test error scenarios

**Success Criteria:**
- [ ] MSW installed and configured
- [ ] Handlers defined for Mux, Resend, OAuth
- [ ] At least 1 component test using MSW passing
- [ ] Error scenarios tested

### 📝 Phase 3: Integration Tests (FUTURE)

**Trigger:** After Phase 1 and Phase 2 are complete

**3.1 Setup**
- [ ] Create `apps/web/__tests__/integration/` directory
- [ ] Create `apps/web/__tests__/integration/helpers/test-providers.tsx`
- [ ] Create shared integration test utilities

**3.2 Test Scenarios**
- [ ] Implement video upload flow test
- [ ] Implement user registration flow test
- [ ] Implement coach booking flow test
- [ ] Add error recovery tests

**3.3 Verification**
- [ ] Run integration tests: `pnpm --filter web test -- integration/`
- [ ] Verify flows work end-to-end
- [ ] Test with Convex test instance

**Success Criteria:**
- [ ] All integration tests passing
- [ ] Key user flows verified end-to-end
- [ ] External APIs mocked correctly
- [ ] Error recovery tested

---

## Quick Reference

### Commands

```bash
# Backend Tests
pnpm --filter backend test                           # Run all
pnpm --filter backend test -- videos.test.ts         # Run one file
pnpm --filter backend test -- --reporter=verbose     # Verbose output

# Frontend Tests
pnpm --filter web test                               # Run all
pnpm --filter web test -- VideoUpload.test.tsx       # Run one file
pnpm --filter web test -- --ui                       # Interactive UI

# Integration Tests
pnpm --filter web test -- integration/               # Run all integration
pnpm --filter web test -- integration/ --ui          # Interactive UI

# All Tests (from root)
pnpm test                                            # Run all workspaces
```

### File Locations

**Backend:**
- Tests: `packages/backend/convex/__tests__/`
- Helpers: `packages/backend/convex/__tests__/helpers.ts`
- Convex Setup: `packages/backend/convex/test.setup.ts`
- Convex Utilities: `packages/backend/convex/__tests__/setup.ts` (deployed, V8-safe)
- Global Setup: `packages/backend/vitest.setup.ts` (not deployed, Node.js APIs allowed)
- Config: `packages/backend/vitest.config.ts`

**Frontend:**
- Tests: `apps/web/__tests__/`
- MSW: `apps/web/__tests__/mocks/`
- Setup: `apps/web/vitest.setup.ts`
- Config: `apps/web/vitest.config.ts`

**Root:**
- Workspace: `vitest.workspace.ts`

---

## Notes

- **File Separation:** Keep Node.js APIs outside `convex/` directory - files inside get deployed to V8 isolate
- **Cron Testing:** Test underlying mutations directly, not cron registration
- **Add MSW later:** Only when you build components that call external APIs
- **Integration tests last:** After core functionality is tested
- **Use proven patterns:** All patterns shown here are tested and working (64 backend tests passing)

**Questions?** Reference this document or check the existing test files for working examples.
