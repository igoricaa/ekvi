# EKVI Testing Strategy & Implementation Plan

## 📋 Document Overview

This document provides a comprehensive testing strategy for the EKVI platform - a Next.js 16 + Convex + React 19 monorepo application. After analyzing the codebase, documentation, and best practices, here's the complete testing roadmap.

---

## 🎯 Executive Summary

**Goal**: Establish robust testing infrastructure covering unit, integration, and E2E tests for a fitness coaching marketplace platform.

**Current State**: No testing infrastructure exists (no test files, configs, or dependencies found).

**Tech Stack**:
- Frontend: Next.js 16 (App Router), React 19, TypeScript, shadcn/ui, Tailwind CSS v4
- Backend: Convex (serverless), Better Auth, Mux (video), Resend (email)
- Tools: pnpm workspaces, Ultracite (Biome), React Compiler

---

## 🏗️ Recommended Testing Architecture

### Testing Pyramid Strategy

```
           /\
          /  \        E2E Tests (Playwright)
         /____\       ~5-10 critical flows
        /      \      Integration Tests (Vitest + Convex Test)
       /        \     ~30-40 backend + component tests
      /__________\    Unit Tests (Vitest)
                      ~50-100 utilities, hooks, functions
```

### 1. **Vitest** - Primary Test Runner ⭐
**Why**: Modern, fast, ESM-native, perfect for Vite-like setups
- **Use Cases**: Unit tests, component tests, integration tests
- **Coverage**: ~70% of all tests
- **Speed**: Parallel execution, instant watch mode, HMR
- **Compatibility**: Works seamlessly with React Testing Library

### 2. **React Testing Library** - Component Testing
**Why**: User-centric testing, encourages accessible code
- **Use Cases**: React component behavior, user interactions
- **Integration**: Works within Vitest tests
- **Philosophy**: Test what users see/do, not implementation details

### 3. **Convex Test** - Backend Testing
**Why**: Official Convex mock implementation for testing
- **Use Cases**: Queries, mutations, actions, schema validation
- **Benefits**: TypeScript support, in-memory database, isolated tests

### 4. **Playwright** - E2E Testing
**Why**: Industry standard, real browsers, excellent tooling
- **Use Cases**: Critical user journeys, authentication flows, video workflows
- **Coverage**: ~5-10 essential user paths
- **Features**: Auto-wait, screenshot on failure, trace viewer

### 5. **MSW (Mock Service Worker)** - API Mocking
**Why**: Intercept network requests at the service worker level
- **Use Cases**: Mock external APIs (Mux, Resend, Google OAuth)
- **Benefits**: Same mocks for tests and development

---

## 📦 Dependencies to Install

```json
{
  "devDependencies": {
    // Core Testing
    "vitest": "^2.1.8",
    "@vitest/ui": "^2.1.8",
    "@vitest/coverage-v8": "^2.1.8",

    // React Testing
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@testing-library/jest-dom": "^6.6.3",

    // Test Environment
    "jsdom": "^26.0.0",

    // E2E Testing
    "@playwright/test": "^1.51.0",

    // Backend Testing
    "convex-test": "^0.0.28",

    // API Mocking
    "msw": "^2.7.0",

    // Utilities
    "@vitejs/plugin-react": "^4.3.4"
  }
}
```

**Install Command**:
```bash
pnpm add -D vitest @vitest/ui @vitest/coverage-v8 @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @playwright/test convex-test msw @vitejs/plugin-react
```

---

## 📁 Proposed Directory Structure

```
ekvi/
├── vitest.workspace.ts          # Monorepo workspace config
├── apps/
│   └── web/
│       ├── vitest.config.ts     # Web app Vitest config
│       ├── playwright.config.ts # E2E config
│       ├── __tests__/           # Unit & component tests
│       │   ├── components/      # Component tests
│       │   │   ├── video-uploader.test.tsx
│       │   │   ├── video-player.test.tsx
│       │   │   └── sign-up.test.tsx
│       │   ├── lib/             # Utility tests
│       │   │   └── validations.test.ts
│       │   └── setup.ts         # Test setup/globals
│       └── e2e/                 # Playwright E2E tests
│           ├── auth.spec.ts
│           ├── video-upload.spec.ts
│           └── onboarding.spec.ts
├── packages/
│   └── backend/
│       ├── vitest.config.ts     # Backend Vitest config
│       └── convex/__tests__/    # Convex function tests
│           ├── users.test.ts
│           ├── profiles.test.ts
│           ├── mux-mutations.test.ts
│           ├── mux-webhooks.test.ts
│           └── setup.ts         # Convex test setup
└── testing_todo.md              # This document
```

---

## 🎬 Implementation Phases

### **Phase 1: Foundation Setup** (Week 1)
**Goal**: Install dependencies, configure test runners, create example tests

**Tasks**:
1. ✅ Install all testing dependencies
2. ✅ Create Vitest workspace config for monorepo
3. ✅ Configure Vitest for web app (with React)
4. ✅ Configure Vitest for backend (Convex)
5. ✅ Set up test environment (jsdom, globals)
6. ✅ Create test setup files with custom matchers
7. ✅ Add test scripts to package.json files
8. ✅ Create 1-2 example tests to validate setup

**Deliverables**:
- `vitest.workspace.ts`
- `apps/web/vitest.config.ts`
- `packages/backend/vitest.config.ts`
- `apps/web/__tests__/setup.ts`
- `packages/backend/convex/__tests__/setup.ts`
- Example tests running successfully

---

### **Phase 2: Backend Testing** (Week 2)
**Goal**: Test all Convex functions (queries, mutations, actions)

**Priority Tests**:

#### **High Priority** (Must Test First):
1. **Authentication Functions** (`users.ts`)
   - ✅ getAuthUser query
   - ✅ updateUserPassword mutation
   - ✅ listSessions query
   - ✅ revokeSession mutation
   - ✅ suspendAccount mutation (admin only)

2. **Profile Functions** (`profiles.ts`)
   - ✅ getCurrentUserProfile query
   - ✅ Profile creation
   - ✅ Profile updates

3. **Mux Mutations** (`mux/mutations.ts`)
   - ✅ deleteVideo mutation (ownership verification)
   - ✅ updateVideoMetadata mutation (ownership verification)
   - ✅ insertVideo internal mutation
   - ✅ cleanupAbandonedUploads internal mutation

4. **Mux Webhooks** (`mux/webhooks.ts`)
   - ✅ handleMuxWebhook HTTP action
   - ✅ Webhook signature verification
   - ✅ video.upload.asset_created event
   - ✅ video.asset.ready event
   - ✅ video.asset.errored event

#### **Medium Priority**:
5. **Mux Queries** (`mux/queries.ts`)
   - ✅ List user videos
   - ✅ Get video by ID
   - ✅ Filter by status

6. **Mux Actions** (`mux/actions.ts`)
   - ✅ createDirectUpload action
   - ✅ deleteMuxAsset action

#### **Test Patterns for Convex Functions**:
```typescript
// Example: Testing a mutation with authorization
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

test("deleteVideo - only owner can delete", async () => {
  const t = convexTest(schema);

  // Create user and video
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("userProfiles", {
      authId: "test-auth-id",
      displayName: "Test User",
      role: "coach",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  const videoId = await t.run(async (ctx) => {
    return await ctx.db.insert("videos", {
      uploadedBy: userId,
      muxAssetId: "test-asset-id",
      title: "Test Video",
      status: "ready",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  // Test successful deletion (owner)
  const result = await t.mutation(api.mux.mutations.deleteVideo, {
    videoId,
  });
  expect(result).toEqual({ success: true });

  // Verify video deleted
  const deletedVideo = await t.run(async (ctx) => {
    return await ctx.db.get(videoId);
  });
  expect(deletedVideo).toBeNull();
});

test("deleteVideo - unauthorized user cannot delete", async () => {
  const t = convexTest(schema);

  // Create two users
  const owner = await t.run(async (ctx) => {
    return await ctx.db.insert("userProfiles", { /* ... */ });
  });

  const otherUser = await t.run(async (ctx) => {
    return await ctx.db.insert("userProfiles", { /* ... */ });
  });

  const videoId = await t.run(async (ctx) => {
    return await ctx.db.insert("videos", {
      uploadedBy: owner,
      // ...
    });
  });

  // Test deletion fails for non-owner
  await expect(async () => {
    await t.mutation(api.mux.mutations.deleteVideo, { videoId });
  }).rejects.toThrowError("Unauthorized");
});
```

**Deliverables**:
- 30-40 backend tests covering all Convex functions
- Edge case testing (empty data, invalid IDs, auth failures)
- Schema validation tests

---

### **Phase 3: Frontend Component Testing** (Week 3)
**Goal**: Test React components focusing on user interactions

**Priority Components**:

#### **High Priority**:
1. **Authentication Forms**
   - ✅ SignUp component (`sign-up.tsx`)
     - Form validation (zod schema)
     - Email/password sign-up flow
     - Google OAuth sign-up
     - Error handling
     - Loading states

   - ✅ SignIn component (`sign-in.tsx`)
     - Email/password sign-in
     - Google OAuth sign-in
     - Error handling

   - ✅ Verify 2FA component
   - ✅ Reset Password component

2. **Video Components**
   - ✅ VideoUploader (`video-uploader.tsx`)
     - Generate upload URL
     - Display Mux uploader
     - Success callback
     - Error handling
     - Loading states

   - ✅ VideoPlayer
     - Playback functionality
     - Mux playback ID rendering

   - ✅ VideoList
     - Display user videos
     - Filter by status
     - Video selection

#### **Medium Priority**:
3. **UI Components** (shadcn/ui customizations)
   - ✅ Form components with react-hook-form
   - ✅ Button states (loading, disabled)
   - ✅ Dialog/Modal accessibility
   - ✅ Card components

4. **Onboarding Flow**
   - ✅ Role selection
   - ✅ Profile creation
   - ✅ Coach-specific onboarding

#### **Test Patterns for Components**:
```typescript
// Example: Testing VideoUploader component
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { VideoUploader } from "@/components/video/video-uploader";

// Mock Convex hooks
vi.mock("convex/react", () => ({
  useAction: vi.fn(),
}));

test("VideoUploader - generates upload URL on button click", async () => {
  const user = userEvent.setup();
  const mockCreateUpload = vi.fn().mockResolvedValue({
    uploadUrl: "https://upload.mux.com/test",
    videoId: "test-video-id",
  });

  vi.mocked(useAction).mockReturnValue(mockCreateUpload);

  render(<VideoUploader title="Test Video" />);

  // Click upload button
  const button = screen.getByRole("button", { name: /upload video/i });
  await user.click(button);

  // Verify action called
  expect(mockCreateUpload).toHaveBeenCalledWith({
    title: "Test Video",
    description: undefined,
  });

  // Verify Mux uploader appears
  await waitFor(() => {
    expect(screen.getByTestId("mux-uploader")).toBeInTheDocument();
  });
});

test("VideoUploader - displays error on failure", async () => {
  const user = userEvent.setup();
  const mockCreateUpload = vi.fn().mockRejectedValue(
    new Error("Failed to create upload")
  );

  vi.mocked(useAction).mockReturnValue(mockCreateUpload);

  render(<VideoUploader />);

  const button = screen.getByRole("button", { name: /upload video/i });
  await user.click(button);

  // Verify error message displayed
  await waitFor(() => {
    expect(screen.getByText(/failed to create upload/i)).toBeInTheDocument();
  });
});
```

**Deliverables**:
- 25-35 component tests
- Form validation tests
- Accessibility tests (ARIA attributes, keyboard navigation)
- Error state tests

---

### **Phase 4: E2E Testing with Playwright** (Week 4)
**Goal**: Test critical user journeys in real browsers

**Critical E2E Flows**:

#### **Priority 1 - Authentication**:
1. ✅ Complete sign-up flow
   - Fill form with valid data
   - Submit form
   - Verify redirect to sign-in
   - Verify email sent (mock)

2. ✅ Complete sign-in flow
   - Enter credentials
   - Submit form
   - Verify redirect to dashboard
   - Verify session created

3. ✅ Google OAuth flow
   - Click "Sign in with Google"
   - Mock OAuth callback
   - Verify authentication

4. ✅ 2FA verification
   - Enable 2FA
   - Verify code entry
   - Verify access granted

#### **Priority 2 - Video Upload**:
5. ✅ Complete video upload workflow
   - Navigate to videos page
   - Click "Upload Video"
   - Generate upload URL
   - Upload file (mock)
   - Verify video appears in list
   - Verify video plays

#### **Priority 3 - Onboarding**:
6. ✅ Coach onboarding flow
   - Select coach role
   - Fill profile information
   - Add specialties
   - Upload intro video
   - Verify profile created

7. ✅ Athlete onboarding flow
   - Select athlete role
   - Fill profile information
   - Verify profile created

#### **E2E Test Pattern**:
```typescript
// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("user can sign up with email", async ({ page }) => {
    await page.goto("http://localhost:3001/sign-up");

    // Fill form
    await page.getByLabel(/first name/i).fill("John");
    await page.getByLabel(/last name/i).fill("Doe");
    await page.getByLabel(/email/i).fill("john@example.com");
    await page.getByLabel("Password", { exact: true }).fill("SecurePass123!");
    await page.getByLabel(/confirm password/i).fill("SecurePass123!");

    // Submit
    await page.getByRole("button", { name: /create an account/i }).click();

    // Verify redirect
    await expect(page).toHaveURL("http://localhost:3001/sign-in");

    // Verify success message (if any)
    // await expect(page.getByText(/account created/i)).toBeVisible();
  });

  test("user can sign in", async ({ page }) => {
    // Prerequisite: User already exists
    await page.goto("http://localhost:3001/sign-in");

    await page.getByLabel(/email/i).fill("john@example.com");
    await page.getByLabel(/password/i).fill("SecurePass123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard|\/onboarding/);
  });
});
```

**Deliverables**:
- Playwright config with multiple browsers (Chromium, Firefox, WebKit)
- 7-10 E2E test scenarios
- Screenshot/video on failure
- CI/CD integration ready

---

### **Phase 5: CI/CD & Tooling** (Week 5)
**Goal**: Automate testing in GitHub Actions, add coverage reports

**Tasks**:
1. ✅ Create GitHub Actions workflow
   - Run unit tests on PR
   - Run E2E tests on main branch
   - Generate coverage reports
   - Upload artifacts

2. ✅ Configure test sharding for Playwright
   - Parallel execution across runners
   - Faster E2E test runs

3. ✅ Add pre-commit hooks
   - Run Ultracite linting
   - Run affected tests only

4. ✅ Set up coverage thresholds
   - Fail PR if coverage drops below 70%

5. ✅ Add test status badges to README

**GitHub Actions Workflow**:
```yaml
# .github/workflows/test.yml
name: Tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json

  e2e-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: npx playwright install --with-deps
      - run: pnpm test:e2e --shard=${{ matrix.shard }}/3

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-results-${{ matrix.shard }}
          path: playwright-report/
```

**Deliverables**:
- Complete GitHub Actions workflow
- Coverage reporting (Codecov or similar)
- Pre-commit hooks configured
- Test documentation

---

## 🧪 Testing Strategies by Feature Type

### **Authentication Testing**
- **Unit**: Validation schemas (zod)
- **Integration**: Auth client calls, session management
- **E2E**: Complete sign-up/sign-in flows

### **Video Upload Testing**
- **Unit**: Helper functions, state management
- **Integration**: Mux API mocking, webhook handling
- **Component**: VideoUploader, file selection, progress
- **E2E**: Complete upload workflow

### **Form Testing**
- **Component**: react-hook-form integration
- **Validation**: zod schema validation
- **Accessibility**: ARIA labels, error messages

### **Convex Function Testing**
- **Queries**: Data retrieval, filters, authorization
- **Mutations**: Data modification, ownership checks
- **Actions**: External API calls (mock with MSW)
- **Webhooks**: Signature verification, event handling

---

## 📊 Coverage Targets

| Test Type | Coverage Target | Priority |
|-----------|----------------|----------|
| Unit Tests | 80% | High |
| Component Tests | 70% | High |
| Integration Tests | 60% | Medium |
| E2E Tests | 5-10 flows | High |
| Backend Functions | 75% | High |

---

## 🛠️ Test Scripts (package.json)

### **Root** (`/package.json`):
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:web": "vitest --workspace apps/web",
    "test:backend": "vitest --workspace packages/backend"
  }
}
```

### **Web App** (`apps/web/package.json`):
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

### **Backend** (`packages/backend/package.json`):
```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch"
  }
}
```

---

## 🎓 Best Practices & Guidelines

### **1. Write User-Centric Tests**
- Test behavior users see, not implementation details
- Use accessible queries (getByRole, getByLabelText)
- Avoid testing internal state

### **2. Mock External Services**
- Mock Mux API calls
- Mock Resend email sending
- Mock Google OAuth
- Use MSW for network requests

### **3. Maintain Test Isolation**
- Each test should be independent
- Clean up database between tests
- Reset mocks between tests

### **4. Test Error States**
- Network failures
- Validation errors
- Authorization failures
- Edge cases (empty data, invalid IDs)

### **5. Keep Tests Fast**
- Run in parallel
- Use jsdom for component tests (better RTL compatibility than happy-dom)
- Mock heavy operations
- Target <5 minutes for full suite

### **6. Accessibility Testing**
- Verify ARIA attributes
- Test keyboard navigation
- Check focus management
- Use semantic HTML

### **7. Meaningful Test Names**
- Describe user action and expected result
- Use "should" or "can" phrasing
- Group related tests with describe blocks

### **8. Don't Test Third-Party Code**
- Don't test shadcn/ui internals
- Don't test Convex framework
- Focus on your application logic

---

## 🚨 Common Pitfalls to Avoid

1. ❌ **Over-mocking**: Only mock external dependencies, not your own code
2. ❌ **Testing implementation**: Focus on outputs, not how they're achieved
3. ❌ **Slow tests**: Keep test suite under 5 minutes
4. ❌ **Flaky tests**: Use proper waits, avoid timeouts
5. ❌ **Skipping error cases**: Test both happy and sad paths
6. ❌ **No test isolation**: Clean up state between tests
7. ❌ **Testing UI libraries**: Trust shadcn/ui, test your usage
8. ❌ **Ignoring accessibility**: Test ARIA, keyboard navigation

---

## 📝 Example Test Files to Create

### **1. Convex Function Test Example**
File: `packages/backend/convex/__tests__/users.test.ts`

### **2. Component Test Example**
File: `apps/web/__tests__/components/video-uploader.test.tsx`

### **3. E2E Test Example**
File: `apps/web/e2e/auth.spec.ts`

### **4. Form Validation Test**
File: `apps/web/__tests__/lib/validations.test.ts`

### **5. Webhook Test**
File: `packages/backend/convex/__tests__/mux-webhooks.test.ts`

---

## 🔄 Testing Workflow

### **Development**:
```bash
# Watch mode for unit tests
pnpm test

# UI mode for debugging
pnpm test:ui

# Test specific file
pnpm test video-uploader

# Run E2E tests in UI mode
pnpm test:e2e:ui
```

### **Pre-commit**:
```bash
# Run linting
pnpm check

# Run affected tests
pnpm test --changed
```

### **CI/CD**:
```bash
# Full test suite with coverage
pnpm test:coverage

# E2E tests with sharding
pnpm test:e2e --shard=1/3
```

---

## 🎯 Success Metrics

- ✅ **80%+ code coverage** for critical paths
- ✅ **<5 minute** total test execution time
- ✅ **Zero flaky tests** in CI/CD
- ✅ **100% E2E coverage** for critical user journeys
- ✅ **All PRs require passing tests** before merge
- ✅ **Test-first development** for new features

---

## 🚀 Quick Start Commands

### **Install Dependencies**:
```bash
pnpm add -D vitest @vitest/ui @vitest/coverage-v8 @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @playwright/test convex-test msw @vitejs/plugin-react
```

### **Install Playwright Browsers**:
```bash
npx playwright install --with-deps
```

### **Switch to jsdom** (if needed):
```bash
# Remove happy-dom
pnpm remove happy-dom

# Install jsdom
pnpm add -D jsdom

# Update vitest.config.ts: environment: "jsdom"
```

### **Run Tests**:
```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage report
pnpm test:coverage
```

---

## 📚 Additional Resources

- **Vitest Docs**: https://vitest.dev
- **Playwright Docs**: https://playwright.dev
- **React Testing Library**: https://testing-library.com/react
- **Convex Testing**: https://docs.convex.dev/testing/convex-test
- **MSW Docs**: https://mswjs.io

---

## ✅ Implementation Checklist

### Phase 1: Foundation
- [ ] Install all dependencies
- [ ] Create vitest.workspace.ts
- [ ] Create apps/web/vitest.config.ts
- [ ] Create packages/backend/vitest.config.ts
- [ ] Create test setup files
- [ ] Add test scripts to package.json
- [ ] Validate with example tests

### Phase 2: Backend Tests
- [ ] Test authentication functions
- [ ] Test profile functions
- [ ] Test video mutations
- [ ] Test Mux webhooks
- [ ] Test video queries
- [ ] Test Mux actions

### Phase 3: Component Tests
- [ ] Test SignUp component
- [ ] Test SignIn component
- [ ] Test VideoUploader component
- [ ] Test VideoPlayer component
- [ ] Test VideoList component
- [ ] Test form validations

### Phase 4: E2E Tests
- [ ] Install Playwright
- [ ] Create playwright.config.ts
- [ ] Test sign-up flow
- [ ] Test sign-in flow
- [ ] Test video upload flow
- [ ] Test onboarding flows

### Phase 5: CI/CD
- [ ] Create GitHub Actions workflow
- [ ] Configure test sharding
- [ ] Set up coverage reporting
- [ ] Add pre-commit hooks
- [ ] Document testing process

---

## 💡 Final Recommendations

1. **Start Small**: Begin with Phase 1, validate setup works
2. **Test Critical Paths First**: Auth and video upload are highest priority
3. **Incremental Adoption**: Don't try to test everything at once
4. **Maintain Tests**: Keep tests up-to-date with code changes
5. **Review Test Coverage**: Use coverage reports to find gaps
6. **Refactor Fearlessly**: Good tests enable confident refactoring
7. **Learn from Failures**: Flaky tests indicate real issues

---

**Ready to implement?** This comprehensive plan provides everything needed to establish world-class testing for the EKVI platform. Let's build it! 🚀
