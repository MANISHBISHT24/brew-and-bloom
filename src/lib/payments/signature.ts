import { createHmac, timingSafeEqual } from "node:crypto";
/** Razorpay documents HMAC-SHA256 signatures; compare digests in constant time. */
export function verifyHmacSha256(payload:string,signature:string,secret:string){if(!/^[0-9a-f]{64}$/i.test(signature))return false;const expected=createHmac("sha256",secret).update(payload,"utf8").digest();const actual=Buffer.from(signature,"hex");return actual.length===expected.length&&timingSafeEqual(expected,actual);}
