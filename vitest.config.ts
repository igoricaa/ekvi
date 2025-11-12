import { defineConfig } from "vitest/config";

/**
 * Root Vitest Configuration for EKVI Monorepo
 *
 * Uses the 'projects' pattern (workspace is deprecated since v3.2).
 * References individual package configs with their root directories.
 *
 * IMPORTANT: This root config is REQUIRED for proper monorepo test discovery.
 * Without it, Vitest ignores project configs and uses default settings.
 */
export default defineConfig({
  test: {
    // Shared defaults (can be overridden by project configs)
    globals: true,
    // Reference individual project directories (Vitest will load their configs)
    projects: ["./apps/web", "./packages/backend"],
  },
});
