import { httpRouter, httpActionGeneric } from "convex/server";
import { internal } from "./_generated/api";

const http = httpRouter();

async function verifySharedSecret(request: Request) {
  const secret = process.env.N8N_SHARED_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  if (!authorization.startsWith("Bearer ")) return false;
  const supplied = authorization.slice(7);
  const suppliedBytes = new TextEncoder().encode(supplied);
  const secretBytes = new TextEncoder().encode(secret);
  if (suppliedBytes.length !== secretBytes.length) return false;
  let difference = 0;
  for (let i = 0; i < suppliedBytes.length; i++) {
    difference |= suppliedBytes[i] ^ secretBytes[i];
  }
  return difference === 0;
}

http.route({
  path: "/n8n/overdue",
  method: "GET",
  handler: httpActionGeneric(async (ctx: any, request: Request) => {
    if (!(await verifySharedSecret(request))) {
      return new Response("Unauthorized", { status: 401 });
    }
    const overdue = await ctx.runQuery(internal.automation.overdueLoans, {});
    const reminders = [];
    for (const loan of overdue) {
      const claimed = await ctx.runMutation(internal.automation.claimReminder, {
        loanId: loan.loanId,
        borrowerId: loan.borrowerId,
        period: loan.period,
      });
      if (claimed) reminders.push(claimed);
    }
    return Response.json({
      reminders,
      generatedAt: new Date().toISOString(),
    });
  }),
});

http.route({
  path: "/n8n/reminder-delivery",
  method: "POST",
  handler: httpActionGeneric(async (ctx: any, request: Request) => {
    if (!(await verifySharedSecret(request))) {
      return new Response("Unauthorized", { status: 401 });
    }
    const body = await request.json();
    if (
      typeof body.loanId !== "string" ||
      typeof body.period !== "string" ||
      typeof body.attemptId !== "string" ||
      typeof body.success !== "boolean"
    ) {
      return new Response("Invalid payload", { status: 400 });
    }
    await ctx.runMutation(internal.automation.recordReminder, {
      loanId: body.loanId,
      period: body.period,
      attemptId: body.attemptId,
      success: body.success,
    });
    return Response.json({ recorded: true });
  }),
});

http.route({
  path: "/n8n/activity",
  method: "GET",
  handler: httpActionGeneric(async (_ctx: any, request: Request) => {
    if (!(await verifySharedSecret(request))) {
      return new Response("Unauthorized", { status: 401 });
    }
    return Response.json({ status: "ok" });
  }),
});

export default http;
