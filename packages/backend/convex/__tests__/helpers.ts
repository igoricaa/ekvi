import { components } from "../_generated/api";
import type { setupConvexTest } from "../test.setup";

/**
 * Test Helpers for Auth Tests
 *
 * Utilities for creating authenticated users and sessions in tests.
 */

/**
 * Create an authenticated Better Auth user with a valid session
 *
 * Returns the test instance configured with the user's identity
 *
 * CRITICAL: We must use component.adapter.create to insert into the Better Auth
 * component's tables, NOT ctx.db.insert() which would try to insert into the main schema.
 */
export async function createAuthenticatedTestUser(
  t: ReturnType<typeof setupConvexTest>,
  options: {
    email: string;
    name: string;
    hasCompletedOnboarding?: boolean;
    accountStatus?: string;
  }
) {
  const result = await t.run(async (ctx) => {
    const now = Date.now();

    // Create user in Better Auth component's user table using component API
    const user = await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: {
          email: options.email,
          name: options.name,
          emailVerified: false,
          createdAt: now,
          updatedAt: now,
          hasCompletedOnboarding: options.hasCompletedOnboarding ?? false,
          accountStatus: options.accountStatus ?? "active",
        },
      },
    });

    // Create session for the user in Better Auth component's session table
    const session = await ctx.runMutation(
      components.betterAuth.adapter.create,
      {
        input: {
          model: "session",
          data: {
            userId: user._id, // Extract _id from user object
            token: `test-token-${user._id}-${now}`, // Better Auth uses this token
            expiresAt: now + 86_400_000, // 24 hours from now
            createdAt: now,
            updatedAt: now,
          },
        },
      }
    );

    return {
      userId: user._id,
      sessionId: session._id,
      sessionToken: session.token,
    };
  });

  // Return test instance with user's identity set
  // CRITICAL: Better Auth expects both subject (userId) and sessionId in the identity
  // - subject: Used to look up the user in the component's 'user' table
  // - sessionId: Used to look up the session in the component's 'session' table
  // - tokenIdentifier: Standard format is "userId|sessionId"
  return {
    asUser: t.withIdentity({
      subject: result.userId,
      sessionId: result.sessionId,
      tokenIdentifier: result.sessionToken,
    }),
    userId: result.userId,
    sessionId: result.sessionId,
  };
}
