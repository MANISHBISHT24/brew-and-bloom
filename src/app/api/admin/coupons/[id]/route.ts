import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { safeJson } from "@/lib/validation/common";

const schema = z.object({ isActive: z.boolean() });
function sameOrigin(request: Request) { try { return new URL(request.headers.get("origin") ?? "").host === new URL(request.url).host; } catch { return false; } }

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: { message: "Request origin could not be verified." } }, { status: 403 });
  const session = await getCurrentSession();
  if (session?.user.role !== "ADMIN") return NextResponse.json({ error: { message: "Administrator access is required." } }, { status: session ? 403 : 401 });
  let raw: unknown;
  try { raw = await safeJson(request, 1_000); } catch { return NextResponse.json({ error: { message: "Invalid coupon update." } }, { status: 400 }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: { message: "Invalid coupon update." } }, { status: 400 });
  const { id } = await params;
  try {
    const coupon = await getPrisma().coupon.update({ where: { id }, data: { isActive: parsed.data.isActive } });
    return NextResponse.json({ id: coupon.id, isActive: coupon.isActive });
  } catch {
    return NextResponse.json({ error: { message: "Coupon could not be updated." } }, { status: 404 });
  }
}
