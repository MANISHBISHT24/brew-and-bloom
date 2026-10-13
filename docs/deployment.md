# Local setup and deployment

## Prerequisites

- Node.js 24 LTS (the current Prisma guide recommends Node 24) and npm.
- Docker Desktop or a PostgreSQL 17-compatible database.
- A Razorpay test account for payment tests. Email delivery is optional and uses Resend.

## Local development

```powershell
Copy-Item .env.example .env
docker compose up -d postgres
```

Set a unique `AUTH_SECRET` (`openssl rand -base64 32` in Git Bash/WSL) in `.env`. Use local-only PostgreSQL credentials. Keep all `.env` files out of Git.

Then install, migrate, seed, and run:

```powershell
npm ci
npm run db:deploy
npm run db:seed
npm run dev
```

The seed contains clearly marked demo products and an empty store profile; it does not create an administrator or business address. To provision the first admin, set `ADMIN_EMAIL`, `ADMIN_NAME`, and a unique `ADMIN_PASSWORD` (12–128 characters) in the current shell and run `npm run admin:create`. The command refuses to change an existing account's role.

If PostgreSQL is not configured, the public site displays a development-only preview catalog. Checkout, sign-up, and persistence remain disabled; the preview is never used in production.

## Verification commands

```powershell
npm run check-types
npm run lint
npm test
npm run test:integration
npm run test:e2e
npm run build
```

Integration tests require an isolated migrated test database in `TEST_DATABASE_URL`. Playwright starts a local dev server and covers the home page, menu search, cart quantity controls, and account entry.

## Razorpay sandbox

Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` using Razorpay test credentials. Register the HTTPS webhook URL `<your-domain>/api/payments/webhook` for payment captured/failed and refund created/processed/failed events, then copy the exact webhook secret into the server environment. Never expose the secret as a `NEXT_PUBLIC_*` variable. Confirm payment signature failures, duplicate webhooks, amount mismatches, refund completion/failure, and ambiguous refund recovery in sandbox before go-live.

## Vercel or compatible Node hosting

1. Create a managed PostgreSQL database and keep its production URL in the hosting secret store. Use a direct connection for migrations where the provider separates pooled and direct URLs.
2. Set `DATABASE_URL`, a unique `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_SITE_URL`, Razorpay test credentials, and optional Resend variables in the production environment.
3. Deploy the project with Node.js 24 and run `npm run db:deploy` as a deliberate release step before traffic is switched to code that requires new columns.
4. Register the production Razorpay webhook, configure a verified domain and HTTPS, and test checkout in test mode.
5. Set up automated encrypted database backups and rehearse a restore. Add error monitoring and a shared rate-limit store before scaling beyond one instance.
6. Review legal copy, business address, hours, delivery settings, menu/allergen facts, image rights, retention rules, CSP, and refund operations with the café owner before accepting live orders.

`DATABASE_URL` must contain an application user with only the required application privileges. Do not run schema migrations from every app instance at startup.
