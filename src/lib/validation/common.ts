import { z } from "zod";
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const nameSchema = z.string().trim().min(2).max(100);
export const phoneSchema = z.string().trim().regex(/^\+?[0-9 ()-]{8,20}$/);
export const safeJson = async (request: Request, maxBytes = 24_000) => {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error("Request too large");
  return JSON.parse(text) as unknown;
};
