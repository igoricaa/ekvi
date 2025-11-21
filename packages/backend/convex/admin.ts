import { components, internal } from "./_generated/api";
import { action, internalMutation } from "./_generated/server";

/**
 * Internal mutation to clean all app tables.
 */
export const cleanAppTables = internalMutation({
  args: {},
  handler: async (ctx) => {
    const counts: Record<string, number> = {};

    // Helper to delete all documents from a table
    async function clearTable(tableName: string) {
      const docs = await ctx.db.query(tableName as any).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
      counts[tableName] = docs.length;
    }

    // Delete in order (respecting foreign key dependencies)

    // 1. Content tables (depend on other tables)
    await clearTable("workouts");
    await clearTable("programModules");
    await clearTable("programs");
    await clearTable("exercises");
    await clearTable("notifications");

    // 2. Media tables
    await clearTable("videos");
    await clearTable("files");

    // 3. Profile tables
    await clearTable("coachProfiles");
    await clearTable("userProfiles");

    return counts;
  },
});

/**
 * Admin action to clean all user data from the database.
 * USE WITH CAUTION - this deletes all user-related data!
 */
export const cleanAllUsers = action({
  args: {},
  handler: async (ctx): Promise<Record<string, number>> => {
    // 1. Clean app tables
    const appCounts = (await ctx.runMutation(
      internal.admin.cleanAppTables
    )) as Record<string, number>;

    // 2. Clean Better Auth component tables
    const authTables = [
      "session",
      "account",
      "verification",
      "jwks",
      "user",
    ] as const;
    const authCounts: Record<string, number> = {};

    for (const model of authTables) {
      // Count first using findMany
      const items = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model,
          paginationOpts: { numItems: 10000, cursor: null },
        }
      );
      authCounts[model] = items.page?.length ?? 0;

      // Then delete
      await ctx.runMutation(
        components.betterAuth.adapter.deleteMany,
        {
          input: { model, where: [] },
          paginationOpts: { numItems: 10000, cursor: null },
        }
      );
    }

    return { ...appCounts, ...authCounts };
  },
});
