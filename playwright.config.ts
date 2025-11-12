import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration for E2E Testing
 *
 * Tests critical user journeys in real browsers:
 * - Authentication flows (sign-up, sign-in, 2FA)
 * - Video upload workflow
 * - Onboarding flows (coach/athlete)
 * - Profile management
 *
 * Browsers: Chromium, Firefox, WebKit
 * Base URL: http://localhost:3001 (Next.js dev server)
 */
export default defineConfig({
  testDir: "./apps/web/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    // Mobile viewports (optional, uncomment when needed)
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // Run dev server before starting tests
  webServer: {
    command: "pnpm dev:web",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
