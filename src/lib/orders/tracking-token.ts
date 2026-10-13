import { createHmac, timingSafeEqual } from "node:crypto";

export function createOrderTrackingToken(orderNumber: string, secret = process.env.AUTH_SECRET) {
  if (!secret) throw new Error("AUTH_SECRET is required to create an order tracking token.");
  return createHmac("sha256", secret).update(`brew-bloom-order:${orderNumber}`).digest("base64url");
}

export function verifyOrderTrackingToken(orderNumber: string, token: string | undefined, secret = process.env.AUTH_SECRET) {
  if (!secret || !token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const expected = Buffer.from(createOrderTrackingToken(orderNumber, secret), "base64url");
  const supplied = Buffer.from(token, "base64url");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
