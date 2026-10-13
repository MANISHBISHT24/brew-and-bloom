# Security notes

## Implemented controls

- Prisma parameterized queries, server-side Zod validation, quantity limits, body-size limits on JSON forms, same-origin checks on checkout/payment/admin mutations, and safe customer-facing errors.
- Better Auth handles password storage and sessions. Customer role values are not accepted from signup or profile forms. Admin product and order routes verify the session role at the server boundary.
- Razorpay keys remain server-side. The browser receives only the test/public key ID and a newly created provider order. Checkout signatures and raw webhooks are verified with HMAC-SHA256 and Node's constant-time byte comparison. Provider payment status, currency, amount, and order reference are checked before fulfillment. Admin refunds require a verified captured payment and send only the full recorded amount back to the original payment; the provider refund ID and receipt are reconciled through signed webhooks.
- Webhook provider event identifiers are unique. Duplicate deliveries do not repeat fulfillment. Stock updates are conditional and transactional.
- Guest order tracking links use a constant-time HMAC check over the order number and `AUTH_SECRET`; signed-in orders remain owner-checked. Treat guest tracking URLs as private links.
- Coupon discounts are recalculated from live catalog prices in checkout. Usage counts and one-use-per-account redemptions are reserved transactionally and released when an unpaid order is cancelled or payment fails.
- Wishlist reads and mutations are scoped to the authenticated user; saved products must still be active catalog entries.
- Account cart merge and save routes accept only product, variant, and bounded quantity identifiers. They ignore browser-supplied names and prices; checkout performs a separate live availability and price check.
- Customer cancellation is limited to eligible unpaid orders before preparation. The update checks current order and payment state transactionally before releasing stock and coupon reservations. Admin refund submission is guarded by a conditional payment-state claim; uncertain provider results remain pending so another provider refund is not submitted blindly. Refund statuses cannot be set through the ordinary order-status endpoint.
- Production response headers include CSP, HTTPS HSTS, frame protection, content-type protection, referrer controls, and a restrictive Permissions Policy.
- Newsletter marketing requires explicit consent. Contact and checkout payload sizes and field lengths are limited.

## Required production work and remaining risks

- The included rate limiter is per-process memory. Replace it with a shared store such as Redis or a provider-managed rate-limit service before deploying to a multi-instance/serverless environment.
- Review account-email verification and password-reset delivery. Resend is optional; until `EMAIL_API_KEY` and a verified `EMAIL_FROM` are configured, reset/verification mail is not delivered.
- Review the CSP against the final hosting, analytics, and image providers. Only Unsplash image URLs are accepted and allowed now; managed uploads, MIME validation, and production image storage are not implemented.
- Configure HTTPS, secret storage, database least privilege, encrypted connections, backup retention, restore tests, monitoring, and dependency update review.
- Guest checkout and token-protected guest order tracking are supported. Configure refund webhooks and verify refund outcomes in the Razorpay sandbox before using the admin refund action with live credentials. Order email notifications are not implemented yet.
- The payment integration is test-ready only after keys and webhook secrets are configured. Run payment sandbox cases and a security review before enabling live keys.
- Terms and privacy pages are visibly marked as draft templates and `noindex`; a real business must review and complete them.

This project has not had an independent penetration test or security certification.
