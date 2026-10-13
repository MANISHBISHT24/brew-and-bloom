import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { getCurrentSession } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { fromDb } from "@/lib/products";
import { safeJson } from "@/lib/validation/common";

const selectionsSchema = z.object({ items: z.array(z.object({ productId: z.string().min(1).max(100), variantId: z.string().min(1).max(100), quantity: z.number().int().min(1).max(20) })).max(30) });

function sameOrigin(request: Request) { try { return new URL(request.headers.get("origin") ?? "").host === new URL(request.url).host; } catch { return false; } }

async function readSelections(request: Request) {
  let raw: unknown;
  try { raw = await safeJson(request, 8_000); } catch { return null; }
  const parsed = selectionsSchema.safeParse(raw);
  if (!parsed.success) return null;
  const merged = new Map<string, { productId: string; variantId: string; quantity: number }>();
  for (const item of parsed.data.items) {
    const key = `${item.productId}:${item.variantId}`;
    const previous = merged.get(key);
    merged.set(key, { ...item, quantity: Math.min(20, item.quantity + (previous?.quantity ?? 0)) });
  }
  return [...merged.values()];
}

async function getValidSelections(tx: Prisma.TransactionClient, selections: NonNullable<Awaited<ReturnType<typeof readSelections>>>) {
  if (!selections.length) return [];
  const variants = await tx.productVariant.findMany({
    where: { id: { in: selections.map((item) => item.variantId) }, isAvailable: true, product: { isAvailable: true, archivedAt: null } },
    select: { id: true, productId: true, stockQuantity: true },
  });
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  return selections.flatMap((item) => {
    const variant = byId.get(item.variantId);
    if (!variant || variant.productId !== item.productId || (variant.stockQuantity !== null && variant.stockQuantity <= 0)) return [];
    return [{ productId: item.productId, variantId: item.variantId, quantity: Math.min(item.quantity, variant.stockQuantity ?? 20) }];
  });
}

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: { message: "Account cart storage is not configured." } }, { status: 503 });
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ authenticated: false, items: [] }, { headers: { "Cache-Control": "private, no-store" } });
  const cart = await getPrisma().cart.findUnique({
    where: { userId: session.user.id },
    include: { items: { include: { product: { include: { category: true, images: { orderBy: { sortOrder: "asc" } }, variants: { where: { isAvailable: true } }, extras: { where: { isAvailable: true } } } }, variant: true } } },
  });
  const items = cart?.items.flatMap((item) => {
    if (!item.variant || item.variant.productId !== item.productId || !item.variant.isAvailable || !item.product.isAvailable || item.product.archivedAt) return [];
    const product = fromDb(item.product);
    const variant = product.variants.find((option) => option.id === item.variant?.id);
    if (!variant) return [];
    return [{ key: `${item.productId}:${variant.id}`, productId: item.productId, slug: product.slug, name: product.name, image: product.image, variantId: variant.id, variantName: variant.name, unitPrice: product.price + variant.priceAdjustment, quantity: item.quantity }];
  }) ?? [];
  return NextResponse.json({ authenticated: true, items }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: { message: "Request origin could not be verified." } }, { status: 403 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: { message: "Account cart storage is not configured." } }, { status: 503 });
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: { message: "Sign in to save your cart." } }, { status: 401 });
  const selections = await readSelections(request);
  if (!selections) return NextResponse.json({ error: { message: "Invalid cart details." } }, { status: 400 });
  try {
    await getPrisma().$transaction(async (tx) => {
      const cart = await tx.cart.upsert({ where: { userId: session.user.id }, create: { userId: session.user.id }, update: {} });
      const valid = await getValidSelections(tx, selections);
      for (const item of valid) {
        const updated = await tx.cartItem.upsert({
          where: { cartId_productId_variantId: { cartId: cart.id, productId: item.productId, variantId: item.variantId } },
          create: { cartId: cart.id, ...item },
          update: { quantity: { increment: item.quantity } },
        });
        if (updated.quantity > 20) await tx.cartItem.updateMany({ where: { cartId: cart.id, productId: item.productId, variantId: item.variantId, quantity: { gt: 20 } }, data: { quantity: 20 } });
      }
    });
    return NextResponse.json({ merged: true });
  } catch (error) {
    console.error("Account cart merge failed", error);
    return NextResponse.json({ error: { message: "Your cart could not be synced. Please try again." } }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: { message: "Request origin could not be verified." } }, { status: 403 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: { message: "Account cart storage is not configured." } }, { status: 503 });
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: { message: "Sign in to save your cart." } }, { status: 401 });
  const selections = await readSelections(request);
  if (!selections) return NextResponse.json({ error: { message: "Invalid cart details." } }, { status: 400 });
  try {
    await getPrisma().$transaction(async (tx) => {
      const cart = await tx.cart.upsert({ where: { userId: session.user.id }, create: { userId: session.user.id }, update: {} });
      const valid = await getValidSelections(tx, selections);
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      if (valid.length) await tx.cartItem.createMany({ data: valid.map((item) => ({ cartId: cart.id, ...item })) });
    });
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("Account cart save failed", error);
    return NextResponse.json({ error: { message: "Your cart could not be saved. Please try again." } }, { status: 503 });
  }
}
