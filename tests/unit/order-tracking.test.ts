import { describe, expect, it } from "vitest";
import { createOrderTrackingToken, verifyOrderTrackingToken } from "@/lib/orders/tracking-token";

describe("guest order tracking token", () => {
  it("authorizes only the order number used to sign the token", () => {
    const token = createOrderTrackingToken("BB-ABC-12345", "test-secret");
    expect(verifyOrderTrackingToken("BB-ABC-12345", token, "test-secret")).toBe(true);
    expect(verifyOrderTrackingToken("BB-OTHER-12345", token, "test-secret")).toBe(false);
  });

  it("rejects malformed tokens and missing secrets", () => {
    expect(verifyOrderTrackingToken("BB-ABC-12345", "short", "test-secret")).toBe(false);
    expect(verifyOrderTrackingToken("BB-ABC-12345", createOrderTrackingToken("BB-ABC-12345", "test-secret"), "other-secret")).toBe(false);
    expect(verifyOrderTrackingToken("BB-ABC-12345", undefined, undefined)).toBe(false);
  });
});
