# Convex Backend

EKVI backend built on Convex - a serverless backend with real-time queries, automatic type generation, and built-in reactivity.

## Development

```bash
# Start Convex dev server (from root)
pnpm dev:convex

# Or from packages/backend
cd packages/backend && pnpm dev

# Deploy to production
pnpx convex deploy
```

## Testing

### Running Tests

```bash
# Run all backend tests
pnpm --filter backend test

# Run specific test file
pnpm --filter backend test -- auth.test.ts

# Run with verbose output
pnpm --filter backend test -- --reporter=verbose

# Run in watch mode
pnpm --filter backend test -- --watch
```

### Test Structure

```
packages/backend/
├── vitest.config.ts              # Vitest configuration
├── vitest.setup.ts               # Global setup (Node.js APIs allowed, not deployed)
└── convex/
    ├── test.setup.ts             # Convex test helper factory
    └── __tests__/
        ├── setup.ts              # Convex utilities (deployed, must be V8-safe)
        ├── helpers.ts            # Auth test helpers
        ├── auth.test.ts          # Auth tests (18 tests)
        ├── videos.test.ts        # Video tests (39 tests)
        └── users.test.ts         # User tests (7 tests)
```

### Writing Tests

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

### Cron Testing Pattern

**Problem**: convex-test doesn't support cron job schedulers.

**Solution**: Test the underlying mutation directly, not the cron registration.

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

**Why**: Cron registration happens during module loading and tries to write to `_scheduled_functions` table. convex-test doesn't support schedulers, so this causes errors. The error is suppressed in `vitest.setup.ts` (see below).

### File Separation: Deployed vs Non-Deployed

**Important**: Files inside `convex/` directory are compiled and deployed to Convex (V8 isolate runtime). Files at backend root are never deployed.

**V8 Isolate Restrictions**:
- No Node.js APIs (process, fs, path, etc.)
- No `process.on()`, `process.env` (except `CONVEX_SITE_URL`)
- Must be V8 isolate-compatible

**File Structure**:
```
packages/backend/
├── vitest.setup.ts              # Node.js APIs allowed (not deployed)
└── convex/
    ├── crons.ts                 # Deployed (V8-safe)
    ├── schema.ts                # Deployed (V8-safe)
    └── __tests__/
        └── setup.ts             # Deployed (V8-safe)
```

**Example** - `vitest.setup.ts` (backend root):
```typescript
// ✅ Safe: This file is NOT deployed
process.on("unhandledRejection", (reason: unknown) => {
  // Suppress scheduler errors from crons.ts during tests
  if (error?.message?.includes("_scheduled_functions")) {
    return;
  }
  throw reason;
});
```

**Example** - `convex/__tests__/setup.ts`:
```typescript
// ⚠️ This file IS deployed - keep it V8-safe
// No process.on(), process.env, fs, etc.

export {}; // Currently empty, for future Convex-specific utilities
```

## Documentation

- [Convex Docs](https://docs.convex.dev)
- [Convex Testing Guide](https://docs.convex.dev/testing/convex-test)
- [Testing Roadmap](../../TESTING-ROADMAP.md) - Full testing patterns and examples
