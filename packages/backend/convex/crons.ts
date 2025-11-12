import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * EKVI Scheduled Jobs (Cron)
 *
 * Defines recurring background tasks that run automatically.
 *
 * IMPORTANT: Cron jobs are disabled in test environments because convex-test
 * doesn't support the scheduler. Test the underlying mutation functions directly.
 *
 * See: https://docs.convex.dev/testing/convex-test
 */

const crons = cronJobs();

/**
 * Cleanup Abandoned Video Uploads
 *
 * Runs daily at 4:00 AM UTC to remove stale video records.
 * Deletes videos stuck in "waiting_for_upload" or "uploading" status
 * for more than 24 hours (likely abandoned by users).
 *
 * Benefits:
 * - Prevents database bloat
 * - Keeps video library clean
 * - Removes orphaned records from incomplete uploads
 *
 * Testing: Call internal.mux.mutations.cleanupAbandonedUploads directly in tests.
 * The scheduler error from convex-test is suppressed in vitest.setup.ts.
 */
crons.daily(
  "cleanup abandoned video uploads",
  { hourUTC: 4, minuteUTC: 0 },
  internal.mux.mutations.cleanupAbandonedUploads
);

export default crons;
