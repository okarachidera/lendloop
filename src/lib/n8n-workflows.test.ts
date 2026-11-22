import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function workflow(name: string) {
  return JSON.parse(
    readFileSync(join(process.cwd(), "n8n", "workflows", name), "utf8")
  );
}

describe("exported n8n workflows", () => {
  it("configures the borrow webhook for raw-body HMAC and replay checks", () => {
    const data = workflow("borrow-request-notifications.json");
    const webhook = data.nodes.find((node: any) => node.name === "Convex Signed Webhook");
    const verifier = data.nodes.find((node: any) => node.name === "Verify HMAC and Replay");
    expect(webhook.parameters.options.rawBody).toBe(true);
    expect(verifier.parameters.jsCode).toContain("timingSafeEqual");
    expect(verifier.parameters.jsCode).toContain("seenEvents");
    expect(verifier.parameters.jsCode).toContain("Replay-protected timestamp rejected");
  });

  it("exports reminder claims, bounded HTTP retries, idempotent writeback, and errors", () => {
    const data = workflow("daily-overdue-reminders.json");
    const fetch = data.nodes.find((node: any) => node.name === "Fetch and Claim Overdue Loans");
    const write = data.nodes.find((node: any) => node.name === "Write Idempotent Delivery Status");
    const reminderError = data.nodes.find((node: any) => node.name === "Reminder Workflow Error");
    expect(fetch.parameters.options.timeout).toBe(10000);
    expect(fetch.parameters.options.retry.maxTries).toBe(3);
    expect(write.parameters.jsonBody).toContain("attemptId");
    expect(reminderError.type).toBe("n8n-nodes-base.errorTrigger");
  });
});
