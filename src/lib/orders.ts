import { OrderStatus, PaymentStatus } from "@/generated/prisma/client";
export const orderTransitions:Record<OrderStatus,OrderStatus[]>={
  PENDING_PAYMENT:["PLACED","PAYMENT_FAILED","CANCELLED"],
  PLACED:["CONFIRMED","CANCELLED"],
  CONFIRMED:["PREPARING","CANCELLED"],
  PREPARING:["READY_FOR_PICKUP","OUT_FOR_DELIVERY","CANCELLED"],
  READY_FOR_PICKUP:["DELIVERED","CANCELLED"],
  OUT_FOR_DELIVERY:["DELIVERED","CANCELLED"],
  DELIVERED:["REFUND_PENDING"],
  CANCELLED:["REFUND_PENDING"],
  REFUND_PENDING:["REFUNDED"],
  REFUNDED:[],
  PAYMENT_FAILED:[],
};
export function canTransitionOrder(from:OrderStatus,to:OrderStatus){return orderTransitions[from].includes(to);}
export function canCustomerCancelOrder(status:OrderStatus,paymentStatus:PaymentStatus){const cancellable:OrderStatus[]=[OrderStatus.PENDING_PAYMENT,OrderStatus.PLACED,OrderStatus.CONFIRMED];return paymentStatus!==PaymentStatus.PAID&&cancellable.includes(status);}
