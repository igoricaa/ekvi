/**
 * Vitest Global Setup
 *
 * This file runs BEFORE all tests and is NOT part of the Convex deployment.
 * Safe to use Node.js APIs (process, fs, etc.) here.
 *
 * Purpose: Suppress expected errors from convex-test limitations.
 */

// Suppress scheduler errors from convex-test
// Cron jobs (crons.ts) try to write to _scheduled_functions table during module loading
// convex-test doesn't support schedulers, so this error is expected and harmless
process.on("unhandledRejection", (reason: unknown) => {
  const error = reason as Error;

  // Suppress scheduler errors related to cron jobs
  if (
    error?.message?.includes("Write outside of transaction") &&
    error?.message?.includes("_scheduled_functions")
  ) {
    // Silently ignore - this is expected when crons.ts is loaded during tests
    return;
  }

  // Re-throw all other unhandled rejections to catch real issues
  throw reason;
});
