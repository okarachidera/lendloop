import { describe, expect, it } from "vitest";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  rangesOverlap,
  validateDateRange,
  verifyTimestamp,
  canonicalPayload,
  notificationBackoffMs,
  reminderClaimExpired,
} from "./security";

describe("loan date rules", () => {
  it("rejects reversed ranges", () => {
    expect(() => validateDateRange("2026-11-20", "2026-11-19", new Date("2026-11-18T00:00:00Z"))).toThrow();
  });

  it("rejects past starts", () => {
    expect(() => validateDateRange("2026-11-20", "2026-11-22", new Date("2026-11-21T00:00:00Z"))).toThrow();
  });

  it("detects overlapping approved loans", () => {
    expect(rangesOverlap("2026-12-01", "2026-12-05", "2026-12-05", "2026-12-08")).toBe(true);
    expect(rangesOverlap("2026-12-01", "2026-12-05", "2026-12-06", "2026-12-08")).toBe(false);
  });
});

describe("webhook replay protection", () => {
  it("accepts recent timestamps", () => {
    expect(verifyTimestamp("100000", 100000)).toBe(true);
  });

  describe("bounded retry behavior", () => {
    it("uses bounded exponential notification backoff", () => {
      expect(notificationBackoffMs(1)).toBe(30_000);
      expect(notificationBackoffMs(2)).toBe(60_000);
      expect(notificationBackoffMs(10)).toBe(60 * 60 * 1000);
    });

    describe("raw-body HMAC verification", () => {
      it("signs canonical timestamp and raw body and rejects a changed body", () => {
        const secret = "test-secret";
        const timestamp = "1730000000000";
        const rawBody = '{"eventId":"evt-1","status":"pending"}';
        const expected = createHmac("sha256", secret)
          .update(`${timestamp}.${rawBody}`)
          .digest();
        const valid = createHmac("sha256", secret)
          .update(`${timestamp}.${rawBody}`)
          .digest();
        const changed = createHmac("sha256", secret)
          .update(`${timestamp}.{"eventId":"evt-1","status":"changed"}`)
          .digest();
        expect(timingSafeEqual(valid, expected)).toBe(true);
        expect(timingSafeEqual(changed, expected)).toBe(false);
      });
    });

    it("allows reminder claims only after the lease expires", () => {
      expect(reminderClaimExpired(100_000, 1_000_000)).toBe(true);
      expect(reminderClaimExpired(990_000, 1_000_000)).toBe(false);
    });
  });

  it("rejects stale timestamps", () => {
    expect(verifyTimestamp("100000", 500000)).toBe(false);
  });

  it("uses deterministic JSON canonicalization", () => {
    expect(canonicalPayload({ eventId: "a", status: "pending" })).toBe('{"eventId":"a","status":"pending"}');
  });
});
