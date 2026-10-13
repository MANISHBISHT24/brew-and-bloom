import { describe, expect, it } from "vitest";
import { canTransitionOrder } from "@/lib/orders";
import { OrderStatus, PaymentStatus } from "@/generated/prisma/client";
import { canCustomerCancelOrder } from "@/lib/orders";

describe("order lifecycle",()=>{
  it("permits only defined fulfillment transitions",()=>{expect(canTransitionOrder(OrderStatus.PLACED,OrderStatus.CONFIRMED)).toBe(true);expect(canTransitionOrder(OrderStatus.CONFIRMED,OrderStatus.PREPARING)).toBe(true);expect(canTransitionOrder(OrderStatus.PLACED,OrderStatus.DELIVERED)).toBe(false);expect(canTransitionOrder(OrderStatus.REFUNDED,OrderStatus.PLACED)).toBe(false);});
  it("allows customers to cancel only unpaid orders before preparation",()=>{expect(canCustomerCancelOrder(OrderStatus.PENDING_PAYMENT,PaymentStatus.PENDING)).toBe(true);expect(canCustomerCancelOrder(OrderStatus.CONFIRMED,PaymentStatus.FAILED)).toBe(true);expect(canCustomerCancelOrder(OrderStatus.PLACED,PaymentStatus.PAID)).toBe(false);expect(canCustomerCancelOrder(OrderStatus.PREPARING,PaymentStatus.PENDING)).toBe(false);});
});
