# EKVI Testing Infrastructure - Implementation Status

**Last Updated**: 2025-01-12
**Status**: Phase 1 Complete ✅ | Backend Tests Working ✅ | Frontend Tests Working ✅

---

## 📊 Current Status

### Test Results Summary

| Category | Passing | Skipped | Total | Status |
|----------|---------|---------|-------|--------|
| **Backend (Convex)** | 61 | 3 | 64 | ✅ Working |
| └─ Auth Tests | 18 | 0 | 18 | ✅ Working |
| └─ Video Tests | 36 | 3 | 39 | ✅ Working |
| └─ User Tests | 7 | 0 | 7 | ✅ Working |
| **Frontend (Web)** | 9 | 0 | 9 | ✅ Working |
| └─ Component Tests | 5 | 0 | 5 | ✅ Working |
| └─ Unit Tests | 4 | 0 | 4 | ✅ Working |
| **Overall** | **70** | **3** | **73** | **96% Passing** |

### Quick Commands

```bash
# Run all tests (recommended)
pnpm test

# Run with UI
pnpm test:ui

# Run specific workspace (use --filter, NOT --project)
pnpm --filter backend test
pnpm --filter web test

# Watch mode
pnpm test  # (default behavior in Vitest v4)
```

---

## 🏗️ What We Implemented

### 1. Vitest v4 Workspace Configuration

**File**: `vitest.workspace.ts`

- Uses Vitest v4's `projects` pattern (not deprecated `workspace`)
- Auto-discovers configs in `apps/*` and `packages/*`
- Enables monorepo-wide test coordination

```typescript
export default defineConfig({
  test: {
    projects: ["apps/*", "packages/*"],
  },
});
```

### 2. Backend Testing (Convex)

**Files**:
- `packages/backend/vitest.config.ts` - Vitest config for Convex
- `packages/backend/vitest.setup.ts` - Global setup (error handlers, Node.js APIs allowed)
- `packages/backend/convex/test.setup.ts` - Convex test helper factory
- `packages/backend/convex/__tests__/setup.ts` - Convex-specific utilities
- `packages/backend/convex/__tests__/auth.test.ts` - Auth tests (18 tests ✅)
- `packages/backend/convex/__tests__/videos.test.ts` - Video tests (39 tests ✅)
- `packages/backend/convex/__tests__/users.test.ts` - User tests (7 tests ✅)
- `packages/backend/convex/__tests__/helpers.ts` - Test utilities

**Key Configuration**:
```typescript
// packages/backend/vitest.config.ts
{
  test: {
    name: "backend",
    environment: "edge-runtime",  // Required for Convex
    globals: true,
    pool: "forks",  // Required for edge-runtime
    setupFiles: [
      "./vitest.setup.ts",           // Global setup (outside convex/, Node.js APIs allowed)
      "./convex/__tests__/setup.ts"  // Convex-specific (inside convex/, must be V8-safe)
    ],
    server: {
      deps: {
        inline: ["convex-test"],  // Required for proper dependency tracking
      },
    },
  }
}
```

**Test Setup Pattern**:
```typescript
// packages/backend/convex/test.setup.ts
import { convexTest } from "convex-test";
import schema from "./schema";
import betterAuthSchema from "./betterAuth/schema";

// Glob patterns for module discovery
export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
const betterAuthModules = import.meta.glob("./betterAuth/**/*.ts");

export function setupConvexTest() {
  const t = convexTest(schema, modules);
  // Register Better Auth component with 3 arguments (name, schema, modules)
  t.registerComponent("betterAuth", betterAuthSchema, betterAuthModules);
  return t;
}
```

**Working Test Example**:
```typescript
import { setupConvexTest } from "../test.setup";

it("should insert and query data", async () => {
  const t = setupConvexTest();

  const profileId = await t.run(async (ctx) => {
    return await ctx.db.insert("userProfiles", {
      authId: "test-auth-123",
      displayName: "Test User",
      role: "athlete",
      // ... other fields
    });
  });

  expect(profileId).toBeDefined();
});
```

**Dependencies Installed** (backend):
- `vite: ^7.2.2` (in devDependencies for `import.meta.glob` TypeScript types)

### 3. Frontend Testing (Next.js 16 + React 19)

**Files**:
- `apps/web/vitest.config.ts` - Vitest config for React
- `apps/web/vitest.setup.ts` - RTL setup and globals
- `apps/web/__tests__/components/example.test.tsx` - Component tests (5 tests ✅)
- `apps/web/__tests__/lib/example.test.ts` - Unit tests (4 tests ✅)

**Key Configuration**:
```typescript
// apps/web/vitest.config.ts
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsconfigPaths(),  // Enable @ imports in tests
    react(),          // JSX transformation
  ],
  test: {
    name: "web",
    environment: "jsdom",  // Browser-like DOM for RTL
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    server: {
      deps: {
        inline: ["@testing-library/react"],
      },
    },
  },
});
```

**Setup File**:
```typescript
// apps/web/vitest.setup.ts
import "@testing-library/jest-dom/vitest";  // Custom matchers MUST come first
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();  // Prevent memory leaks
});
```

**Working Test Example**:
```typescript
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";

it("should increment count on button click", async () => {
  const user = userEvent.setup();
  render(<Counter />);

  const button = screen.getByRole("button", { name: /increment/i });
  await user.click(button);

  expect(screen.getByText("Count: 1")).toBeInTheDocument();
});
```

### 4. Installed Dependencies

**Root** (`package.json`):
```json
{
  "devDependencies": {
    "@edge-runtime/vm": "^5.0.0",
    "@playwright/test": "^1.56.1",
    "@testing-library/dom": "^10.4.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@vitejs/plugin-react": "^4.7.0",
    "@vitest/coverage-v8": "^4.0.8",
    "@vitest/ui": "^4.0.8",
    "convex-test": "^0.0.38",
    "jsdom": "^27.2.0",
    "msw": "^2.12.1",
    "vite-tsconfig-paths": "^5.1.4",
    "vitest": "^4.0.8"
  }
}
```

**Backend** (`packages/backend/package.json`):
```json
{
  "devDependencies": {
    "typescript": "^5.9.3",
    "vite": "^7.2.2"  // For import.meta.glob types
  }
}
```

### 5. Test Scripts

**Root** (`package.json`):
```json
{
  "scripts": {
    "test": "vitest",
    "test:once": "vitest run",
    "test:ui": "vitest --ui",
    "test:debug": "vitest --inspect-brk --no-file-parallelism",
    "test:coverage": "vitest run --coverage --coverage.reporter=text",
    "test:web": "vitest --project web",      // ⚠️ Currently broken
    "test:backend": "vitest --project backend",  // ⚠️ Currently broken
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

**Web App** (`apps/web/package.json`):
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Backend** (`packages/backend/package.json`):
```json
{
  "scripts": {
    "test": "vitest",
    "test:once": "vitest run",
    "test:debug": "vitest --inspect-brk --no-file-parallelism",
    "test:coverage": "vitest run --coverage --coverage.reporter=text",
    "test:watch": "vitest --watch"
  }
}
```

---

## 🎯 Testing Patterns

### Cron Testing Pattern

**Problem**: convex-test doesn't support cron job schedulers. When crons.ts registers cron jobs during test module loading, it tries to write to the `_scheduled_functions` table, causing scheduler errors.

**Solution**: Separate test setup files by deployment context:

**File Separation Pattern**:
```
packages/backend/
├── vitest.setup.ts              ✅ Outside convex/, Node.js APIs allowed
└── convex/
    └── __tests__/
        └── setup.ts             ✅ Inside convex/, gets deployed, must be V8-safe
```

**Why This Matters**:
- Files in `convex/` directory are compiled and deployed to Convex (V8 isolate runtime)
- V8 isolates don't have Node.js APIs like `process.on()`
- Files at backend root (like `vitest.setup.ts`) are never deployed

**Implementation**:

1. **vitest.setup.ts** (backend root) - Suppress expected errors:
```typescript
// Suppress scheduler errors from convex-test (crons.ts tries to register jobs)
process.on("unhandledRejection", (reason: unknown) => {
  const error = reason as Error;

  if (
    error?.message?.includes("Write outside of transaction") &&
    error?.message?.includes("_scheduled_functions")
  ) {
    return; // Expected - convex-test doesn't support schedulers
  }

  throw reason; // Re-throw all other errors
});
```

2. **vitest.config.ts** - Use both setup files:
```typescript
setupFiles: [
  "./vitest.setup.ts",           // Global setup (error handlers)
  "./convex/__tests__/setup.ts"  // Convex-specific utilities
]
```

3. **Test cron functions directly**:
```typescript
// ❌ Don't test cron registration
// crons.daily("cleanup", { hourUTC: 4 }, internal.cleanup);

// ✅ Test the underlying mutation
it("should cleanup abandoned uploads", async () => {
  const t = setupConvexTest();
  await t.mutation(internal.mux.mutations.cleanupAbandonedUploads);
  // assertions...
});
```

**Key Takeaway**: Keep Node.js APIs (process, fs, etc.) in files outside `convex/` directory. Files inside `convex/` must be V8 isolate-compatible.

---

## 🚨 Current Issues & Blockers

### Issue #1: Project Filtering Doesn't Work ⚠️

**Status**: `pnpm test:web` and `pnpm test:backend` fail
**Error**: `No projects matched the filter "web"` / `"backend"`

**Root Cause**: Vitest v4 workspace configuration with `projects` pattern may not support `--project` filtering.

**Workaround**:
```bash
# ✅ Use pnpm workspace filtering:
pnpm --filter web test
pnpm --filter backend test

# ✅ Or run all tests:
pnpm test
```

---

## 📚 Technical Deep Dives

### Why jsdom instead of happy-dom?

**Decision**: Use `jsdom` for component tests (configured in `apps/web/vitest.config.ts`)

**Reasons**:
1. **Better RTL Compatibility**: jsdom has 95%+ DOM API coverage vs happy-dom ~90%
2. **Mature Library**: jsdom is the de facto standard for Node.js DOM testing
3. **happy-dom v20 Breaking Changes**: Recent versions broke some RTL matchers
4. **Industry Standard**: Most React projects use jsdom with RTL

**Trade-offs**:
- happy-dom is faster (~2-3x) but less compatible
- jsdom is slightly slower but more reliable
- For our test suite size, speed difference is negligible (<1 second)

### Why vite-tsconfig-paths plugin?

**Plugin**: `vite-tsconfig-paths` in `apps/web/vitest.config.ts`

**Purpose**: Enables TypeScript path aliases (like `@/components`) in tests

**How it works**:
1. Reads path mappings from tsconfig.json (`"@/*": ["./"]`)
2. Tells Vite's module resolver how to resolve these imports
3. Bridges gap between TypeScript compiler and Vite's runtime

**Without it**:
```typescript
// ❌ This would fail in tests:
import { Button } from "@/components/ui/button";
// Error: Cannot find module '@/components/ui/button'

// ✅ You'd have to use relative paths:
import { Button } from "../../components/ui/button";
```

**With it**:
```typescript
// ✅ Works in both source code and tests:
import { Button } from "@/components/ui/button";
```

### Why vite in backend devDependencies?

**File**: `packages/backend/package.json`
**Dependency**: `"vite": "^7.2.2"` in devDependencies

**Question**: Why add vite when vitest already depends on it?

**Answer**: For TypeScript type discovery of `import.meta.glob`

**The Problem**:
```typescript
// packages/backend/convex/test.setup.ts
/// <reference types="vite/client" />
export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
//                     ^^^^^^^^^^^^^^^^ TypeScript error without vite
```

**Root Cause**:
- `import.meta.glob` is a Vite-specific feature requiring type definitions
- Vitest depends on vite, but it's nested at `node_modules/vitest/node_modules/vite/`
- TypeScript's `typeRoots` can't find types in nested node_modules
- Adding vite to devDependencies creates a symlink at `node_modules/vite/`
- TypeScript can now find the types

**Impact**:
- **Bundle Size**: Zero (devDependencies not shipped to production)
- **Disk Space**: Zero (pnpm deduplicates via symlinks to existing install)
- **Performance**: Zero (same vite binary used)
- **Benefits**: TypeScript types work, better IDE support

**Is this proper?**: Yes
- Explicit dependencies are monorepo best practice
- Makes type requirements visible in package.json
- No practical downsides

### Better Auth Component Registration

**File**: `packages/backend/convex/test.setup.ts`
**Function**: `t.registerComponent()`

**Signature**: Requires 3 arguments (not 2)
```typescript
t.registerComponent(
  name: string,          // Component name ("betterAuth")
  schema: Schema,        // Component's schema
  modules: GlobModule    // Component's modules (glob import)
);
```

**Correct Usage**:
```typescript
import betterAuthSchema from "./betterAuth/schema";

const betterAuthModules = import.meta.glob("./betterAuth/**/*.ts");

export function setupConvexTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("betterAuth", betterAuthSchema, betterAuthModules);
  return t;
}
```

**Why Needed**:
Better Auth is a Convex component that has its own schema and functions. To test code that uses Better Auth, convex-test needs to know about the component's structure.

### Describe Blocks vs Flat Tests

**Question**: Why use `describe()` blocks when official Convex docs use flat `test()` structure?

**Official Pattern** (from Convex docs):
```typescript
test("should create a user", async () => { ... });
test("should update a user", async () => { ... });
test("should delete a user", async () => { ... });
```

**Our Pattern**:
```typescript
describe("User Management", () => {
  describe("Profile Creation", () => {
    it("should create a new user profile", async () => { ... });
    it("should prevent duplicate profiles", async () => { ... });
  });

  describe("Profile Updates", () => {
    it("should update user profile", async () => { ... });
  });
});
```

**Why We Use describe()**:

1. **Organization**: Groups related tests logically
2. **Shared Setup**: Can use `beforeEach()` within describe blocks
3. **Better Output**: Test reports show hierarchy
4. **Industry Standard**: Most test suites use describe blocks
5. **Scalability**: Easier to navigate large test files

**Functionally Identical**: Both patterns work exactly the same in Vitest. The choice is purely organizational.

---

## 📁 File Structure

```
ekvi/
├── vitest.workspace.ts              # ✅ Vitest v4 workspace config
├── package.json                     # ✅ Root test scripts
│
├── apps/web/
│   ├── vitest.config.ts            # ✅ React testing config
│   ├── vitest.setup.ts             # ✅ RTL setup + jest-dom
│   ├── package.json                # ✅ Web test scripts
│   └── __tests__/
│       ├── components/
│       │   └── example.test.tsx    # ✅ 5 tests passing
│       └── lib/
│           └── example.test.ts     # ✅ 4 tests passing
│
├── packages/backend/
│   ├── vitest.config.ts            # ✅ Convex testing config
│   ├── vitest.setup.ts             # ✅ Global setup (error handlers)
│   ├── package.json                # ✅ Backend test scripts + vite
│   └── convex/
│       ├── test.setup.ts           # ✅ setupConvexTest() helper
│       └── __tests__/
│           ├── setup.ts            # ✅ Convex-specific utilities
│           ├── auth.test.ts        # ✅ 18 tests passing
│           ├── videos.test.ts      # ✅ 39 tests passing
│           ├── users.test.ts       # ✅ 7 tests passing
│           └── helpers.ts          # ✅ Auth test helpers
│
└── testing_todo.md                 # 📄 This document
```

---

## 🎯 Next Steps

### Immediate Priorities

1. **Fix Project Filtering** 🟡 **MEDIUM**
   - Update root package.json scripts to use `pnpm --filter`
   - Or document correct usage patterns

2. **Expand Test Coverage** 🟢 **ONGOING**
   - Add tests for new features as they're built
   - Add component tests for UI:
     - Sign-up form
     - Sign-in form
     - Video uploader
     - Video player

### Phase 2: Expand Test Coverage

4. **Component Testing**
   - Test auth forms (sign-up, sign-in, 2FA, reset password)
   - Test video components (uploader, player, list)
   - Test onboarding flows
   - Target: 70%+ component coverage

5. **E2E Testing with Playwright**
   - Set up Playwright config
   - Test critical user journeys:
     - Complete sign-up → sign-in → onboarding flow
     - Upload video → view video → delete video
     - Coach verification → profile setup
   - Target: 5-10 critical flows

6. **CI/CD Integration**
   - Create GitHub Actions workflow
   - Run tests on PR
   - Generate coverage reports
   - Upload test artifacts

### Phase 3: Advanced Testing

7. **API Mocking with MSW**
   - Mock Mux API calls
   - Mock Resend email API
   - Mock Google OAuth

8. **Coverage Thresholds**
   - Add coverage enforcement to CI
   - Set per-package thresholds
   - Fail PR if coverage drops

---

## 📖 Test Writing Patterns

### Backend (Convex) Tests

```typescript
import { describe, expect, it } from "vitest";
import { setupConvexTest } from "../test.setup";

describe("Feature Name", () => {
  it("should do something", async () => {
    const t = setupConvexTest();

    // Insert test data
    const id = await t.run(async (ctx) => {
      return await ctx.db.insert("tableName", { ... });
    });

    // Query or mutate
    const result = await t.query(api.module.function, { ... });

    // Assert
    expect(result).toBeDefined();
  });
});
```

### Frontend (React) Tests

```typescript
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

describe("Component Name", () => {
  it("should render correctly", () => {
    render(<MyComponent />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should handle user interaction", async () => {
    const user = userEvent.setup();
    render(<MyComponent />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByText("Clicked!")).toBeInTheDocument();
  });
});
```

---

## 🔍 Debugging Tests

### Common Issues

**1. Import Errors in Tests**
```
Error: Cannot find module '@/components/...'
```
**Fix**: Ensure `vite-tsconfig-paths` plugin is in vitest.config.ts

**2. RTL Matchers Not Working**
```
Error: expect(...).toBeInTheDocument is not a function
```
**Fix**: Import `@testing-library/jest-dom/vitest` BEFORE cleanup in setup file

**3. Edge Runtime Errors**
```
Error: process is not defined
```
**Fix**: Ensure `environment: "edge-runtime"` and `pool: "forks"` in backend config

**4. Better Auth Unauthenticated**
```
Error: Unauthenticated
```
**Fix**: This is the known issue #1 - no workaround yet

### Debugging Commands

```bash
# Debug specific test
pnpm test:debug auth.test.ts

# Run tests with verbose output
pnpm --filter backend test -- --reporter=verbose

# Run single test file
pnpm test auth.test

# UI mode for interactive debugging
pnpm test:ui
```

---

## 📝 Summary

### ✅ What's Working

- Vitest v4 workspace configuration
- Backend testing infrastructure (edge-runtime, convex-test)
- Frontend testing infrastructure (jsdom, RTL, React 19)
- Test setup file separation (vitest.setup.ts vs convex/__tests__/setup.ts)
- Cron testing pattern (call mutations directly, suppress scheduler errors)
- Better Auth integration with convex-test
- 70 tests passing across backend and frontend

### ⚠️ Minor Issues

- Project filtering (`--project` flag) doesn't work - use `pnpm --filter` instead

### 🎯 Next Steps

1. Fix project filtering scripts or document workaround
2. Add component tests for UI as features are built
3. Expand backend test coverage as new features are added

### 📊 Current Coverage

- **Backend**: 61/64 tests passing (95%)
- **Frontend**: 9/9 tests passing (100%)
- **Overall**: 70/73 tests passing (96%)

---

**Last Updated**: 2025-11-12
**Test Infrastructure**: Complete ✅
**Test Writing**: Ready (once auth issue resolved) ⏳
