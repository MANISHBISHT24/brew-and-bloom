import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentSession } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { safeJson } from "@/lib/validation/common";
import { z } from "zod";

const schema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,32}$/),
  description: z.string().trim().max(200).optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().finite().positive().max(100_000),
  minimumSubtotal: z.number().finite().positive().max(250_000).optional(),
  maxRedemptions: z.number().int().positive().max(1_000_000).optional(),
  expiresAt: z.iso.datetime().optional(),
}).superRefine((value, ctx) => {
  if (value.discountType === "PERCENTAGE" && value.discountValue > 100) ctx.addIssue({ code: "custom", path: ["discountValue"], message: "Percentage discounts cannot exceed 100%." });
  if (value.expiresAt && new Date(value.expiresAt) <= new Date()) ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Expiry must be in the future." });
});

function sameOrigin(request: Request) { try { return new URL(request.headers.get("origin") ?? "").host === new URL(request.url).host; } catch { return false; } }

async function adminResponse() {
  const session = await getCurrentSession();
  if (session?.user.role === "ADMIN") return null;
  return NextResponse.json({ error: { message: "Administrator access is required." } }, { status: session ? 403 : 401 });
}

export async function GET() {
  const denied = await adminResponse();
  if (denied) return denied;
  const coupons = await getPrisma().coupon.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ coupons: coupons.map((coupon) => ({ ...coupon, discountValue: Number(coupon.discountValue.toString()), minimumSubtotal: coupon.minimumSubtotal ? Number(coupon.minimumSubtotal.toString()) : null })) });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: { message: "Request origin could not be verified." } }, { status: 403 });
  const denied = await adminResponse();
  if (denied) return denied;
  let raw: unknown;
  try { raw = await safeJson(request, 4_000); } catch { return NextResponse.json({ error: { message: "Invalid coupon details." } }, { status: 400 }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: { message: "Check the coupon code, discount, minimum, and expiry." } }, { status: 400 });
  const value = parsed.data;
  try {
    const coupon = await getPrisma().coupon.create({ data: { code: value.code, description: value.description, discountType: value.discountType, discountValue: new Prisma.Decimal(value.discountValue.toFixed(2)), minimumSubtotal: value.minimumSubtotal === undefined ? null : new Prisma.Decimal(value.minimumSubtotal.toFixed(2)), maxRedemptions: value.maxRedemptions ?? null, expiresAt: value.expiresAt ? new Date(value.expiresAt) : null } });
    return NextResponse.json({ coupon: { ...coupon, discountValue: Number(coupon.discountValue.toString()), minimumSubtotal: coupon.minimumSubtotal ? Number(coupon.minimumSubtotal.toString()) : null } }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return NextResponse.json({ error: { message: "That coupon code already exists." } }, { status: 409 });
    console.error("Coupon creation failed", error);
    return NextResponse.json({ error: { message: "Coupon could not be created." } }, { status: 503 });
  }
}
