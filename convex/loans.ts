import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import { getAuthenticatedUser, requireAdmin } from "./auth";
import { internal } from "./_generated/api";

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Dates must use YYYY-MM-DD");
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed)) throw new Error("Invalid date");
  return parsed;
}

async function createNotification(
  ctx: any,
  type: "request_created" | "request_approved" | "request_declined" | "loan_returned" | "loan_overdue",
  loan: any,
  recipientId: any,
  toolName: string
) {
  await ctx.db.insert("notificationEvents", {
    eventId: crypto.randomUUID(),
    type,
    loanId: loan._id,
    recipientId,
    payload: {
      toolName,
      startDate: loan.startDate,
      endDate: loan.endDate,
      status: loan.status,
    },
    status: "pending",
    attemptCount: 0,
    createdAt: Date.now(),
  });
  await ctx.scheduler.runAfter(0, internal.automation.dispatchPendingEvents, {});
}

export const request = mutationGeneric({
  args: {
    toolId: v.id("tools"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const borrower = await getAuthenticatedUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool || tool.status !== "available") throw new Error("Tool is not available");
    if (tool.ownerId === borrower._id) throw new Error("Cannot borrow your own tool");
    const start = parseDateOnly(args.startDate);
    const end = parseDateOnly(args.endDate);
    const today = Date.parse(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
    if (start < today) throw new Error("Start date cannot be in the past");
    if (end <= start) throw new Error("End date must be after start date");
    if (end - start > 365 * DAY_MS) throw new Error("Date range is too long");

    const approved = await ctx.db
      .query("loanRequests")
      .withIndex("by_tool_status", (q: any) =>
        q.eq("toolId", args.toolId).eq("status", "approved")
      )
      .collect();
    if (approved.some((loan) => start <= parseDateOnly(loan.endDate) && end >= parseDateOnly(loan.startDate))) {
      throw new Error("Tool is already approved for an overlapping date range");
    }

    const loanId = await ctx.db.insert("loanRequests", {
      toolId: args.toolId,
      borrowerId: borrower._id,
      lenderId: tool.ownerId,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await createNotification(ctx, "request_created", {
      _id: loanId,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "pending",
    }, tool.ownerId, tool.name);
    return loanId;
  },
});

export const decide = mutationGeneric({
  args: {
    loanId: v.id("loanRequests"),
    decision: v.union(v.literal("approved"), v.literal("declined")),
  },
  handler: async (ctx, args) => {
    const lender = await getAuthenticatedUser(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new Error("Request not found");
    if (loan.lenderId !== lender._id) throw new Error("Not authorized");
    if (loan.status !== "pending") throw new Error("Request is no longer pending");
    const tool = await ctx.db.get(loan.toolId);
    if (!tool) throw new Error("Listing not found");

    if (args.decision === "approved") {
      const approved = await ctx.db
        .query("loanRequests")
        .withIndex("by_tool_status", (q: any) =>
          q.eq("toolId", loan.toolId).eq("status", "approved")
        )
        .collect();
      const start = parseDateOnly(loan.startDate);
      const end = parseDateOnly(loan.endDate);
      if (approved.some((other) => start <= parseDateOnly(other.endDate) && end >= parseDateOnly(other.startDate))) {
        throw new Error("Overlapping approved loan");
      }
    }

    await ctx.db.patch(args.loanId, {
      status: args.decision,
      updatedAt: Date.now(),
    });
    await createNotification(ctx, args.decision === "approved" ? "request_approved" : "request_declined", {
      ...loan,
      status: args.decision,
    }, loan.borrowerId, tool.name);
  },
});

export const returnLoan = mutationGeneric({
  args: { loanId: v.id("loanRequests") },
  handler: async (ctx, args) => {
    const lender = await getAuthenticatedUser(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new Error("Request not found");
    if (loan.lenderId !== lender._id) throw new Error("Not authorized");
    if (loan.status !== "approved") throw new Error("Only approved loans can be returned");
    const tool = await ctx.db.get(loan.toolId);
    if (!tool) throw new Error("Listing not found");
    await ctx.db.patch(args.loanId, { status: "returned", updatedAt: Date.now() });
    await ctx.db.patch(loan.toolId, { status: "available", updatedAt: Date.now() });
    await createNotification(ctx, "loan_returned", { ...loan, status: "returned" }, loan.borrowerId, tool.name);
  },
});

export const outgoing = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const loans = await ctx.db
      .query("loanRequests")
      .withIndex("by_borrower", (q: any) => q.eq("borrowerId", user._id))
      .collect();
    return await Promise.all(loans.map(async (loan) => ({
      ...loan,
      tool: await ctx.db.get(loan.toolId),
    })));
  },
});

export const incoming = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const loans = await ctx.db
      .query("loanRequests")
      .withIndex("by_lender", (q: any) => q.eq("lenderId", user._id))
      .collect();
    return await Promise.all(loans.map(async (loan) => ({
      ...loan,
      tool: await ctx.db.get(loan.toolId),
    })));
  },
});

export const adminAll = queryGeneric({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const loans = await ctx.db.query("loanRequests").collect();
    return await Promise.all(loans.map(async (loan) => ({
      ...loan,
      tool: await ctx.db.get(loan.toolId),
    })));
  },
});
