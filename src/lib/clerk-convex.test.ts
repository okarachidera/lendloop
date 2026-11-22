import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Clerk and Convex integration contract", () => {
  it("configures the convex JWT template and provider application ID", () => {
    const authConfig = readFileSync(join(process.cwd(), "convex", "auth.config.ts"), "utf8");
    const provider = readFileSync(join(process.cwd(), "src", "components", "app-provider.tsx"), "utf8");
    const env = readFileSync(join(process.cwd(), ".env.example"), "utf8");

    expect(authConfig).toContain("applicationID: \"convex\"");
    expect(authConfig).toContain("CLERK_JWT_ISSUER_DOMAIN");
    expect(provider).toContain('template: convexJwtTemplate');
    expect(env).toContain("NEXT_PUBLIC_CLERK_CONVEX_JWT_TEMPLATE=convex");
    expect(env).toContain("CLERK_JWT_ISSUER_DOMAIN=");
  });

  it("does not publish listing condition or description in public tool responses", () => {
    const tools = readFileSync(join(process.cwd(), "convex", "tools.ts"), "utf8");
    expect(tools).toContain("name, category, _id");
    expect(tools).toContain("name: tool.name");
    expect(tools).toContain("category: tool.category");
  });

  it("uses attempt-bound acknowledgements for notification and reminder retries", () => {
    const automation = readFileSync(join(process.cwd(), "convex", "automation.ts"), "utf8");
    expect(automation).toContain("attemptId");
    expect(automation).toContain("event.attemptId !== args.attemptId");
    expect(automation).toContain("delivery.attemptId !== args.attemptId");
    expect(automation).toContain("nextAttemptAt");
  });
});
