import { describe, expect, it } from "vitest";
import {
  rangesOverlap,
  validateDateRange,
  verifyTimestamp,
  canonicalPayload,
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

  it("rejects stale timestamps", () => {
    expect(verifyTimestamp("100000", 500000)).toBe(false);
  });

  it("uses deterministic JSON canonicalization", () => {
    expect(canonicalPayload({ eventId: "a", status: "pending" })).toBe('{"eventId":"a","status":"pending"}');
  });
});
