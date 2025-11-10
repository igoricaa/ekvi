import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * EKVI Scheduled Jobs (Cron)
 *
 * Defines recurring background tasks that run automatically.
 */

const crons = cronJobs();

/**
 * Cleanup Abandoned Video Uploads
 *
 * Runs daily at 3:00 AM UTC to remove stale video records.
 * Deletes videos stuck in "waiting_for_upload" or "uploading" status
 * for more than 24 hours (likely abandoned by users).
 *
 * Benefits:
 * - Prevents database bloat
 * - Keeps video library clean
 * - Removes orphaned records from incomplete uploads
 */
crons.daily(
  "cleanup abandoned video uploads",
  { hourUTC: 4, minuteUTC: 0 },
  internal.mux.mutations.cleanupAbandonedUploads
);

export default crons;
