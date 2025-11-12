import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/**
 * Vitest Setup for Web App Testing
 *
 * This file runs before each test file in the web app.
 *
 * Setup:
 * - Imports @testing-library/jest-dom for custom matchers FIRST
 *   (toBeInTheDocument, toHaveClass, toBeVisible, etc.)
 * - Configures automatic cleanup after each test to prevent memory leaks
 *
 * Environment: jsdom (configured in vitest.config.ts)
 * - Provides browser-like DOM environment (window, document, etc.)
 * - Required for React Testing Library to work in Node.js
 * - Better compatibility with RTL matchers than happy-dom
 *
 * Custom matchers available:
 * - expect(element).toBeInTheDocument()
 * - expect(element).toHaveClass('className')
 * - expect(element).toBeVisible()
 * - expect(element).toHaveTextContent('text')
 * - And many more from @testing-library/jest-dom
 */

// Cleanup DOM after each test to prevent memory leaks
// and ensure test isolation
afterEach(() => {
  cleanup();
});
