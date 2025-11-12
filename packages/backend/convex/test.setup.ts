/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import betterAuthSchema from "./betterAuth/schema";
import schema from "./schema";

/**
 * Convex Test Setup
 *
 * Centralized configuration for Convex backend testing.
 *
 * This file provides:
 * 1. Glob pattern for module discovery (import.meta.glob)
 * 2. Test helper factory function
 * 3. Shared test utilities
 *
 * Why glob pattern is needed:
 * - convex-test needs to load all your Convex function modules
 * - The glob pattern tells Vite which files to include at build time
 * - Pattern excludes test files (*.test.ts) and type definitions (*.d.ts)
 *
 * Glob Pattern (used below in import.meta.glob):
 * - Starts with: "./**" (all files in any subdirectory)
 * - Has exclusion: Files with 2+ dots like test.ts, spec.ts, d.ts
 * - Matches only: .ts and .js file extensions
 *
 * Matches:    users.ts, auth.ts, profiles.ts
 * Excludes:   example.test.ts, schema.d.ts, setup.ts
 */

// Vite's import.meta.glob() discovers Convex function modules at build time
// This must be a string literal (not a variable) for Vite to process it
// Pattern explanation:
// - Include: all .ts/.js files in subdirectories
// - Exclude: test files (*.test.ts), type definitions (*.d.ts), __tests__ dir, and crons.ts
// export const modules = import.meta.glob([
//   "./**/*.ts",
//   "./**/*.js",
//   "!./**/*.test.ts",
//   "!./**/*.spec.ts",
//   "!./**/*.d.ts",
//   "!./__tests__/**", // Exclude test directory
//   "!./crons.ts", // Exclude crons.ts - not supported by convex-test
// ]);

export const modules = import.meta.glob([
  "./**/*.ts",
  "./**/*.js",
  "!./**/*.{test,spec}.{ts,js}", // Exclude all test files
  "!./**/*.d.ts", // Exclude type definitions
  "!./__tests__/**/*", // Exclude entire __tests__ directory (not just .ts files)
  "!./test.setup.ts", // Exclude this file itself
  "!./crons.ts", // Exclude crons (not supported by convex-test)
]);

/**
 * Create a new Convex test instance
 *
 * Usage in tests:
 * ```typescript
 * import { setupConvexTest } from "../test.setup";
 *
 * describe("Users", () => {
 *   it("should create a user", async () => {
 *     const t = setupConvexTest();
 *     const userId = await t.run(async (ctx) => {
 *       return await ctx.db.insert("userProfiles", {...});
 *     });
 *     expect(userId).toBeDefined();
 *   });
 * });
 * ```
 */

const betterAuthModules = import.meta.glob("./betterAuth/**/*.ts");

export function setupConvexTest() {
  const t = convexTest(schema, modules);

  t.registerComponent("betterAuth", betterAuthSchema, betterAuthModules);

  return t;
}
