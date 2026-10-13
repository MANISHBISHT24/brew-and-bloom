# Brew & Bloom

**Crafted Slowly. Enjoyed Daily.** A responsive Next.js coffee café storefront with a PostgreSQL/Prisma catalog, persistent guest bag, server-repriced checkout, Better Auth accounts, role-checked admin routes, and Razorpay payment verification.

## Stack

- Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4 and reusable CSS design tokens.
- Motion, Lucide React, React Hook Form, and Zod.
- PostgreSQL with Prisma ORM 7.10 and the `pg` driver adapter.
- Better Auth email/password sign-in with optional Resend password-reset and verification email delivery.
- Razorpay Node SDK for test-mode order creation and payment reconciliation.
- Vitest and Playwright.

## Start locally

Prerequisites: Node.js 24 LTS, npm, Docker Desktop or PostgreSQL 17, and a Razorpay test account for checkout.

```powershell
Copy-Item .env.example .env
```

Set a fresh `AUTH_SECRET` in `.env` (`openssl rand -base64 32` in WSL/Git Bash). Start PostgreSQL and initialize the database:

```powershell
docker compose up -d postgres
npm ci
npm run db:deploy
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. If `DATABASE_URL` is absent, the storefront shows a development preview catalog and checkout/account persistence remains disabled. Seed data is for local development only.

## Create the first administrator

The seed never creates a default admin account. Set these in the current PowerShell session, using a unique password of at least 12 characters, then run:

```powershell
$env:ADMIN_EMAIL = "owner@example.com"
$env:ADMIN_NAME = "Store Owner"
$env:ADMIN_PASSWORD = "use-a-unique-password-from-your-password-manager"
npm run admin:create
Remove-Item Env:ADMIN_PASSWORD
```

The provisioning script refuses to promote or overwrite an existing account.

## Razorpay test checkout

Add your test-mode `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` to the server environment. Configure Razorpay to send the relevant payment events to `https://<your-domain>/api/payments/webhook`. The checkout remains disabled when any required payment credentials are missing. Never use live credentials until the test flow, refund operations, deployment settings, and security review are complete.

## Quality checks

```powershell
npm run check-types
npm run lint
npm test
npm run test:integration
npm run test:e2e
npm run build
```

Set `TEST_DATABASE_URL` to an isolated migrated database before running integration tests. Playwright starts a local Next.js dev server.

## Database and deployment guides

- [Database design and relationships](docs/database.md)
- [API outline](docs/api.md)
- [Security controls and remaining risks](docs/security.md)
- [Local setup, Razorpay configuration, and deployment](docs/deployment.md)

## Current scope

Implemented: responsive editorial storefront; database-backed product catalog and filtering; product sizes; browser-persisted guest cart with account merge and persistence; signed-in product wishlist; authoritative server-side totals; configurable pickup/delivery fees and tax; coupon eligibility, customer use limits, and order reservations; signed guest order tracking links; cancellation for eligible unpaid orders before preparation; Better Auth accounts and password reset integration; ownership-checked signed-in order history; constrained order transitions; Razorpay payment verification, full refunds, and webhook reconciliation; admin product and coupon management, basic store settings, and operational order updates; paid-order dashboard metrics; contact/newsletter persistence; and setup/security documentation.

Still requires café/provider configuration or further build-out: real business location, hours, legal policies, confirmed allergy data, production image storage/uploads, pickup time slots and operating-hours validation, a configured and sandbox-verified Razorpay refund flow, transactional order email templates, shared multi-instance rate limiting, analytics by category/product, and automated backup/restore infrastructure. Refunds remain disabled until valid Razorpay credentials and a migrated database are configured.
