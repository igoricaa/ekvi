import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Get the directory of this config file (works in both ESM and when loaded from workspace)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vitest Configuration for Web App (Next.js 16 + React 19)
 *
 * This config enables testing of:
 * - React components (using React Testing Library)
 * - UI utilities and helper functions
 * - Form validation schemas (zod)
 * - Client-side business logic
 *
 * Environment: jsdom (mature, excellent RTL compatibility)
 * Plugins:
 * - @vitejs/plugin-react (for JSX transformation)
 * - vite-tsconfig-paths (for TypeScript path alias support in tests)
 */
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    name: "web",
    environment: "jsdom",
    globals: true, // Enable global test APIs and environment globals
    setupFiles: [path.resolve(__dirname, "./vitest.setup.ts")],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/e2e/**", // E2E tests use Playwright
    ],
    server: {
      deps: {
        inline: ["@testing-library/react"], // Inline for better environment handling
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "**/node_modules/**",
        "**/.next/**",
        "**/dist/**",
        "**/*.config.{ts,js}",
        "**/__tests__/**",
        "**/e2e/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@convex": path.resolve(__dirname, "../../packages/backend/convex"),
    },
  },
});
