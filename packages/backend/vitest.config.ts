import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Vitest Configuration for Convex Backend
 *
 * This config enables testing of:
 * - Convex queries (data retrieval)
 * - Convex mutations (data modification)
 * - Convex actions (external API calls)
 * - HTTP endpoints and webhooks
 * - Schema validation
 *
 * Environment: edge-runtime (required for convex-test)
 * Test Library: convex-test (official Convex testing utilities)
 */
export default defineConfig({
  test: {
    name: "backend",
    environment: "edge-runtime",
    globals: true,
    setupFiles: [
      "./vitest.setup.ts", // Global setup (error handlers, outside convex/)
      "./convex/__tests__/setup.ts", // Convex-specific test utilities
    ],
    include: ["convex/**/*.{test,spec}.ts"],
    exclude: [
      "**/node_modules/**",
      "**/.convex/**",
      "**/dist/**",
      "convex/_generated/**", // Exclude auto-generated Convex files
    ],
    pool: "forks", // Required for edge-runtime environment
    server: {
      deps: {
        inline: ["convex-test"], // Required for proper dependency tracking
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "**/node_modules/**",
        "**/.convex/**",
        "**/dist/**",
        "**/*.config.{ts,js}",
        "**/__tests__/**",
        "convex/_generated/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./convex"),
    },
  },
});
