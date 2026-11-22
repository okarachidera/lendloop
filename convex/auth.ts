import { mutationGeneric, queryGeneric } from "convex/server";

export async function getAuthenticatedUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Authentication required");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new Error("User profile not initialized");
  return user;
}

export async function requireAdmin(ctx: any) {
  const user = await getAuthenticatedUser(ctx);
  if (user.role !== "admin") throw new Error("Admin privileges required");
  return user;
}

export const ensureUser = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      role: "user",
      trustedLender: false,
      createdAt: Date.now(),
    });
  },
});

export const me = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

export const adminUsers = queryGeneric({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("users").collect();
  },
});
