# API outline

All request bodies are validated on the server. Error responses use a user-safe `message`, and privileged operations repeat authorization checks inside the route handler.

| Method and path | Purpose | Access |
|---|---|---|
| `GET /api/products` | Search, category and price filters, sort, pagination | Public |
| `POST /api/newsletter` | Store an email with required marketing consent | Public, rate limited |
| `POST /api/contact` | Store a customer support message | Public, rate limited |
| `POST /api/auth/*` and `GET /api/auth/*` | Better Auth registration, sign-in, sessions, password reset | Public/session |
| `GET /api/cart` | Read the signed-in customer's current cart | Session |
| `POST /api/cart` | Merge validated guest cart selections after sign-in | Session, same-origin |
| `PUT /api/cart` | Replace the signed-in customer's cart selections | Session, same-origin |
| `GET /api/wishlist` | Read the signed-in customer's saved products | Session |
| `POST /api/wishlist` | Save an active catalog product | Session, same-origin |
| `DELETE /api/wishlist?productId=:id` | Remove a saved product | Session, same-origin |
| `POST /api/checkout/orders` | Reprice available products, reserve stock, create a pending order and Razorpay order | Public, same-origin, rate limited |
| `POST /api/checkout/coupons` | Validate a coupon against the displayed subtotal for a preview | Public, same-origin, rate limited |
| `POST /api/orders/:orderNumber/cancel` | Cancel an eligible unpaid order before preparation | Owner session or private tracking token, same-origin |
| `POST /api/payments/verify` | Reconcile a Razorpay checkout callback against the provider | Public, same-origin, rate limited |
| `POST /api/payments/webhook` | Validate and idempotently process Razorpay payment and refund webhooks | Razorpay signature |
| `POST /api/admin/products` | Create a catalog product | ADMIN |
| `PATCH /api/admin/products/:id` | Update or archive a product | ADMIN |
| `PATCH /api/admin/orders/:id` | Apply an allowed order transition | ADMIN |
| `POST /api/admin/orders/:id/refund` | Issue a full refund for a verified paid order and track the provider result | ADMIN, same-origin |
| `POST /api/admin/coupons` | Create a percentage or fixed coupon | ADMIN |
| `PATCH /api/admin/coupons/:id` | Activate or deactivate a coupon | ADMIN |

Signed-in order history filters records by the session user ID. Guest order pages require an HMAC token tied to the order number and `AUTH_SECRET`. Coupon previews are estimates; checkout reloads prices and validates eligibility again before atomically reserving a use. The checkout request never accepts a client price or payment state.
