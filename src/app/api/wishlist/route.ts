import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { safeJson } from "@/lib/validation/common";

const schema = z.object({ productId: z.string().min(1).max(100) });
function sameOrigin(request: Request) { try { return new URL(request.headers.get("origin") ?? "").host === new URL(request.url).host; } catch { return false; } }

async function sessionOrResponse() {
  const session = await getCurrentSession();
  return session ?? NextResponse.json({ error: { message: "Sign in to save products to your wishlist." } }, { status: 401 });
}

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: { message: "Wishlist storage is not configured." } }, { status: 503 });
  const auth = await sessionOrResponse();
  if (auth instanceof NextResponse) return auth;
  const items = await getPrisma().wishlistItem.findMany({ where: { userId: auth.user.id }, include: { product: { select: { id: true, name: true, slug: true } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: { message: "Request origin could not be verified." } }, { status: 403 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: { message: "Wishlist storage is not configured." } }, { status: 503 });
  const auth = await sessionOrResponse();
  if (auth instanceof NextResponse) return auth;
  let raw: unknown;
  try { raw = await safeJson(request, 1_000); } catch { return NextResponse.json({ error: { message: "Invalid wishlist item." } }, { status: 400 }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: { message: "Invalid wishlist item." } }, { status: 400 });
  const db = getPrisma();
  const product = await db.product.findFirst({ where: { id: parsed.data.productId, archivedAt: null } });
  if (!product) return NextResponse.json({ error: { message: "Product could not be found." } }, { status: 404 });
  const item = await db.wishlistItem.upsert({ where: { userId_productId: { userId: auth.user.id, productId: product.id } }, create: { userId: auth.user.id, productId: product.id }, update: {} });
  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: { message: "Request origin could not be verified." } }, { status: 403 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: { message: "Wishlist storage is not configured." } }, { status: 503 });
  const auth = await sessionOrResponse();
  if (auth instanceof NextResponse) return auth;
  const productId = new URL(request.url).searchParams.get("productId");
  const parsed = schema.safeParse({ productId });
  if (!parsed.success) return NextResponse.json({ error: { message: "Invalid wishlist item." } }, { status: 400 });
  await getPrisma().wishlistItem.deleteMany({ where: { userId: auth.user.id, productId: parsed.data.productId } });
  return NextResponse.json({ removed: true });
}
