import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import { getAuthenticatedUser, requireAdmin } from "./auth";
import { internal } from "./_generated/api";

export const publicList = queryGeneric({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const listed = args.category
      ? await ctx.db
          .query("tools")
          .withIndex("by_category", (q: any) => q.eq("category", args.category!))
          .collect()
      : await ctx.db.query("tools").collect();
    return listed
      .filter((tool) => tool.status === "available")
      .map(({ name, category, _id }) => ({
        _id,
        name,
        category,
      }));
  },
});

export const getPublic = queryGeneric({
  args: { id: v.id("tools") },
  handler: async (ctx, args) => {
    const tool = await ctx.db.get(args.id);
    if (!tool || tool.status !== "available") return null;
    return {
      _id: tool._id,
      name: tool.name,
      category: tool.category,
    };
  },
});

export const myListings = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    return await ctx.db
      .query("tools")
      .withIndex("by_owner", (q: any) => q.eq("ownerId", user._id))
      .collect();
  },
});

export const create = mutationGeneric({
  args: {
    name: v.string(),
    category: v.string(),
    condition: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const name = args.name.trim();
    if (name.length < 2 || name.length > 80) throw new Error("Name must be 2-80 characters");
    if (!args.category.trim() || args.description.trim().length > 500) {
      throw new Error("Invalid listing fields");
    }
    return await ctx.db.insert("tools", {
      name,
      category: args.category.trim(),
      condition: args.condition,
      description: args.description.trim(),
      ownerId: user._id,
      status: "available",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutationGeneric({
  args: {
    id: v.id("tools"),
    name: v.string(),
    category: v.string(),
    condition: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const tool = await ctx.db.get(args.id);
    if (!tool) throw new Error("Listing not found");
    if (tool.ownerId !== user._id) throw new Error("Not authorized");
    await ctx.db.patch(args.id, {
      name: args.name.trim(),
      category: args.category.trim(),
      condition: args.condition,
      description: args.description.trim(),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutationGeneric({
  args: { id: v.id("tools") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const tool = await ctx.db.get(args.id);
    if (!tool) throw new Error("Listing not found");
    if (tool.ownerId !== user._id && user.role !== "admin") {
      throw new Error("Not authorized");
    }
    const active = await ctx.db
      .query("loanRequests")
      .withIndex("by_tool_status", (q: any) => q.eq("toolId", args.id).eq("status", "approved"))
      .unique();
    if (active) throw new Error("Cannot delete a listing with an active loan");
    const pending = await ctx.db
      .query("loanRequests")
      .withIndex("by_tool_status", (q: any) =>
        q.eq("toolId", args.id).eq("status", "pending")
      )
      .collect();
    for (const loan of pending) {
      await ctx.db.patch(loan._id, {
        status: "cancelled",
        updatedAt: Date.now(),
      });
      await ctx.db.insert("notificationEvents", {
        eventId: crypto.randomUUID(),
        type: "request_cancelled",
        loanId: loan._id,
        recipientId: loan.borrowerId,
        payload: {
          toolName: tool.name,
          startDate: loan.startDate,
          endDate: loan.endDate,
          status: "cancelled",
        },
        status: "pending",
        attemptCount: 0,
        nextAttemptAt: Date.now(),
        createdAt: Date.now(),
      });
      await ctx.scheduler.runAfter(0, internal.automation.dispatchPendingEvents, {});
    }
    await ctx.db.delete(args.id);
  },
});

export const setTrustedLender = mutationGeneric({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.userId, { trustedLender: true });
  },
});
