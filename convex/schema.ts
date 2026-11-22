import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    role: v.union(v.literal("user"), v.literal("admin")),
    trustedLender: v.boolean(),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  tools: defineTable({
    name: v.string(),
    category: v.string(),
    condition: v.string(),
    description: v.string(),
    ownerId: v.id("users"),
    status: v.union(v.literal("available"), v.literal("inactive")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_category", ["category"]),

  loanRequests: defineTable({
    toolId: v.id("tools"),
    borrowerId: v.id("users"),
    lenderId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("returned"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_borrower", ["borrowerId"])
    .index("by_lender", ["lenderId"])
    .index("by_tool_status", ["toolId", "status"]),

  notificationEvents: defineTable({
    eventId: v.string(),
    type: v.union(
      v.literal("request_created"),
      v.literal("request_approved"),
      v.literal("request_declined"),
      v.literal("request_cancelled"),
      v.literal("loan_returned"),
      v.literal("loan_overdue")
    ),
    loanId: v.id("loanRequests"),
    recipientId: v.id("users"),
    payload: v.object({
      toolName: v.string(),
      startDate: v.string(),
      endDate: v.string(),
      status: v.string(),
    }),
    status: v.union(
      v.literal("pending"),
      v.literal("claimed"),
      v.literal("delivered"),
      v.literal("failed")
    ),
    attemptCount: v.number(),
    attemptId: v.optional(v.string()),
    nextAttemptAt: v.optional(v.number()),
    lastAttemptAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_event_id", ["eventId"])
    .index("by_status", ["status"]),

  automationActivity: defineTable({
    workflow: v.string(),
    loanId: v.optional(v.id("loanRequests")),
    action: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    details: v.optional(v.string()),
    occurredAt: v.number(),
  }).index("by_loan", ["loanId"]),

  reminderDeliveries: defineTable({
    loanId: v.id("loanRequests"),
    borrowerId: v.id("users"),
    period: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("claimed"),
      v.literal("delivered"),
      v.literal("failed")
    ),
    attemptId: v.optional(v.string()),
    nextAttemptAt: v.optional(v.number()),
    attemptCount: v.number(),
    lastAttemptAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_loan_period", ["loanId", "period"])
    .index("by_status", ["status"]),

  idempotencyKeys: defineTable({
    key: v.string(),
    scope: v.string(),
    resourceId: v.string(),
    createdAt: v.number(),
  }).index("by_key", ["key"]),
});
