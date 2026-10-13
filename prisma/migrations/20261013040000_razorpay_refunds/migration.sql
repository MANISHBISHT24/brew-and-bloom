ALTER TABLE "Refund" ADD COLUMN "providerReceipt" TEXT;

CREATE UNIQUE INDEX "Refund_providerReceipt_key" ON "Refund"("providerReceipt");
