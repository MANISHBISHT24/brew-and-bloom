import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyHmacSha256 } from "@/lib/payments/signature";
describe("payment signature verification",()=>{const secret="test-secret";const body="order_id|payment_id";const valid=createHmac("sha256",secret).update(body).digest("hex");it("accepts a correct HMAC SHA-256 signature",()=>expect(verifyHmacSha256(body,valid,secret)).toBe(true));it("rejects tampered body and malformed signatures",()=>{expect(verifyHmacSha256(`${body}x`,valid,secret)).toBe(false);expect(verifyHmacSha256(body,"not-hex",secret)).toBe(false);});});
