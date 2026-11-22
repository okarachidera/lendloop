import {
  actionGeneric,
  internalMutationGeneric,
  internalQueryGeneric,
} from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

function utcToday() {
  return new Date().toISOString().slice(0, 10);
}

export const dispatchPendingEvents = actionGeneric({
  args: {},
  handler: async (ctx) => {
    const secret = process.env.N8N_WEBHOOK_SECRET;
    const url = process.env.N8N_BORROW_WEBHOOK_URL;
    if (!secret || !url) return { skipped: true };

    const pending = await ctx.runQuery(internal.automation.pendingEvents, {});
    for (const event of pending) {
      const timestamp = String(Date.now());
      const canonical = JSON.stringify({
        eventId: event.eventId,
        timestamp,
        type: event.type,
        loanId: event.loanId,
        recipientId: event.recipientId,
        payload: event.payload,
      });
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(`${timestamp}.${canonical}`)
      );
      const hex = Array.from(new Uint8Array(signature), (byte) =>
        byte.toString(16).padStart(2, "0")
      ).join("");
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-lendloop-timestamp": timestamp,
            "x-lendloop-event-id": event.eventId,
            "x-lendloop-signature": `sha256=${hex}`,
          },
          body: canonical,
          signal: AbortSignal.timeout(8000),
        });
        await ctx.runMutation(internal.automation.recordEventResult, {
          eventId: event.eventId,
          success: response.ok,
        });
      } catch {
        await ctx.runMutation(internal.automation.recordEventResult, {
          eventId: event.eventId,
          success: false,
        });
      }
    }
    return { processed: pending.length };
  },
});

export const pendingEvents = internalQueryGeneric({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("notificationEvents")
      .withIndex("by_status", (q: any) => q.eq("status", "pending"))
      .collect();
    return events.filter((event) => event.attemptCount < 5).slice(0, 20);
  },
});

export const recordEventResult = internalMutationGeneric({
  args: { eventId: v.string(), success: v.boolean() },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("notificationEvents")
      .withIndex("by_event_id", (q: any) => q.eq("eventId", args.eventId))
      .unique();
    if (!event) return;
    await ctx.db.patch(event._id, {
      status: args.success ? "delivered" : "failed",
      attemptCount: event.attemptCount + 1,
      lastAttemptAt: Date.now(),
    });
  },
});

export const overdueLoans = internalQueryGeneric({
  args: {},
  handler: async (ctx) => {
    const today = utcToday();
    const period = today;
    const approved = await ctx.db
      .query("loanRequests")
      .filter((q) => q.eq(q.field("status"), "approved"))
      .collect();
    const overdue = approved.filter((loan) => loan.endDate < today);
    const results = [];
    for (const loan of overdue) {
      const existing = await ctx.db
        .query("reminderDeliveries")
        .withIndex("by_loan_period", (q: any) =>
          q.eq("loanId", loan._id).eq("period", period)
        )
        .unique();
      if (existing) continue;
      const borrower = await ctx.db.get(loan.borrowerId);
      const tool = await ctx.db.get(loan.toolId);
      if (!borrower || !tool) continue;
      results.push({
        loanId: loan._id,
        borrowerId: loan.borrowerId,
        toolName: tool.name,
        endDate: loan.endDate,
        period,
      });
    }
    return results;
  },
});

export const createReminder = internalMutationGeneric({
  args: {
    loanId: v.id("loanRequests"),
    borrowerId: v.id("users"),
    period: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("reminderDeliveries")
      .withIndex("by_loan_period", (q: any) =>
        q.eq("loanId", args.loanId).eq("period", args.period)
      )
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("reminderDeliveries", {
      ...args,
      status: "pending",
      attemptCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const recordReminder = internalMutationGeneric({
  args: {
    loanId: v.id("loanRequests"),
    period: v.string(),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db
      .query("reminderDeliveries")
      .withIndex("by_loan_period", (q: any) =>
        q.eq("loanId", args.loanId).eq("period", args.period)
      )
      .unique();
    if (!delivery) return;
    await ctx.db.patch(delivery._id, {
      status: args.success ? "delivered" : "failed",
      attemptCount: delivery.attemptCount + 1,
      lastAttemptAt: Date.now(),
    });
  },
});
