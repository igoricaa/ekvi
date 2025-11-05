import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("athlete"), v.literal("coach"), v.literal("admin")),
    createdAt: v.number(),
  }).index("by_email", ["email"]),
});
