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
      const claimed = await ctx.runMutation(internal.automation.claimNotificationEvent, {
        eventId: event.eventId,
      });
      if (!claimed) continue;
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
          attemptId: claimed,
          success: response.ok,
        });
      } catch {
        await ctx.runMutation(internal.automation.recordEventResult, {
          eventId: event.eventId,
          attemptId: claimed,
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
    const pending = await ctx.db
      .query("notificationEvents")
      .withIndex("by_status", (q: any) => q.eq("status", "pending"))
      .collect();
    const claimed = await ctx.db
      .query("notificationEvents")
      .withIndex("by_status", (q: any) => q.eq("status", "claimed"))
      .collect();
    const now = Date.now();
    return [...pending, ...claimed]
      .filter(
        (event) =>
          event.attemptCount < 5 &&
          (!event.nextAttemptAt || event.nextAttemptAt <= now)
      )
      .slice(0, 20);
  },
});

export const claimNotificationEvent = internalMutationGeneric({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("notificationEvents")
      .withIndex("by_event_id", (q: any) => q.eq("eventId", args.eventId))
      .unique();
    if (!event) return false;
    if (event.status === "delivered" || event.status === "failed") return false;
    const now = Date.now();
    if (
      event.status === "claimed" &&
      event.nextAttemptAt &&
      event.nextAttemptAt > now
    ) {
      return false;
    }
    const attemptId = crypto.randomUUID();
    await ctx.db.patch(event._id, {
      status: "claimed",
      attemptId,
      nextAttemptAt: now + 5 * 60 * 1000,
      lastAttemptAt: now,
    });
    return attemptId;
  },
});

export const recordEventResult = internalMutationGeneric({
  args: { eventId: v.string(), attemptId: v.string(), success: v.boolean() },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("notificationEvents")
      .withIndex("by_event_id", (q: any) => q.eq("eventId", args.eventId))
      .unique();
    if (!event) return;
    if (event.attemptId !== args.attemptId) return;
    if (event.status === "delivered" || event.status === "failed") return;
    const now = Date.now();
    if (args.success) {
      await ctx.db.patch(event._id, {
        status: "delivered",
        attemptCount: event.attemptCount + 1,
        attemptId: undefined,
        lastAttemptAt: now,
      });
      return;
    }
    const attemptCount = event.attemptCount + 1;
    if (attemptCount >= 5) {
      await ctx.db.patch(event._id, {
        status: "failed",
        attemptCount,
        attemptId: undefined,
        lastAttemptAt: now,
      });
      return;
    }
    const backoffMs = Math.min(
      60 * 60 * 1000,
      30 * 1000 * 2 ** (attemptCount - 1)
    );
    await ctx.db.patch(event._id, {
      status: "pending",
      attemptCount,
      attemptId: undefined,
      nextAttemptAt: now + backoffMs,
      lastAttemptAt: now,
    });
    await ctx.scheduler.runAfter(
      backoffMs,
      internal.automation.dispatchPendingEvents,
      {}
    );
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

export const claimReminder = internalMutationGeneric({
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
    const now = Date.now();
    if (existing) {
      if (existing.status === "delivered") return null;
      if (existing.status === "failed" && existing.attemptCount >= 5) return null;
      if (
        existing.status === "claimed" &&
        existing.nextAttemptAt &&
        existing.nextAttemptAt > now
      ) {
        return null;
      }
      if (
        existing.status === "pending" &&
        existing.nextAttemptAt &&
        existing.nextAttemptAt > now
      ) {
        return null;
      }
      const attemptId = crypto.randomUUID();
      await ctx.db.patch(existing._id, {
        status: "claimed",
        attemptId,
        nextAttemptAt: now + 15 * 60 * 1000,
        lastAttemptAt: now,
      });
      const loan = await ctx.db.get(existing.loanId);
      const tool = loan ? await ctx.db.get(loan.toolId) : null;
      return {
        loanId: existing.loanId,
        borrowerId: existing.borrowerId,
        toolName: tool?.name,
        endDate: loan?.endDate,
        period: existing.period,
        attemptId,
      };
    }
    const attemptId = crypto.randomUUID();
    await ctx.db.insert("reminderDeliveries", {
      ...args,
      status: "claimed",
      attemptId,
      attemptCount: 0,
      nextAttemptAt: now + 15 * 60 * 1000,
      lastAttemptAt: now,
      createdAt: now,
    });
    const loan = await ctx.db.get(args.loanId);
    const tool = loan ? await ctx.db.get(loan.toolId) : null;
    return loan
      ? {
          loanId: args.loanId,
          borrowerId: args.borrowerId,
          toolName: tool?.name,
          endDate: loan.endDate,
          period: args.period,
          attemptId,
        }
      : null;
  },
});

export const recordReminder = internalMutationGeneric({
  args: {
    loanId: v.id("loanRequests"),
    period: v.string(),
    attemptId: v.string(),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db
      .query("reminderDeliveries")
      .withIndex("by_loan_period", (q: any) =>
        q.eq("loanId", args.loanId).eq("period", args.period)
      )
      .unique();
    if (!delivery || delivery.attemptId !== args.attemptId) return { idempotent: true };
    if (delivery.status === "delivered") return { idempotent: true };
    const now = Date.now();
    if (args.success) {
      await ctx.db.patch(delivery._id, {
        status: "delivered",
        lastAttemptAt: now,
        nextAttemptAt: undefined,
      });
      return { idempotent: true };
    }
    const attemptCount = delivery.attemptCount + 1;
    if (attemptCount >= 5) {
      await ctx.db.patch(delivery._id, {
        status: "failed",
        attemptCount,
        lastAttemptAt: now,
        nextAttemptAt: undefined,
      });
      return { idempotent: true };
    }
    const backoffMs = Math.min(
      60 * 60 * 1000,
      30 * 1000 * 2 ** (attemptCount - 1)
    );
    await ctx.db.patch(delivery._id, {
      status: "pending",
      attemptCount,
      nextAttemptAt: now + backoffMs,
      lastAttemptAt: now,
      attemptId: undefined,
    });
    return { idempotent: true };
  },
});
