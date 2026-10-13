CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");

CREATE UNIQUE INDEX "CartItem_cartId_productId_variantId_key" ON "CartItem"("cartId", "productId", "variantId");
