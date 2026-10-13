# Architecture

Next.js server components read the catalog and store settings through small server-side helpers. The browser owns the presentation and a guest cart copy in local storage; at checkout it sends only product IDs, option IDs, and quantities. The checkout route loads current PostgreSQL prices and availability, computes paise-safe totals, creates an order and stock reservation in a transaction, then creates the Razorpay provider order. A server-side callback verification and signed webhook reconcile payment before changing the order to `PLACED`.

Better Auth owns registration, session, password hashing, and reset flows. `getCurrentSession` is used in protected pages; admin route handlers independently enforce the `ADMIN` role. Customer order queries include the current session user ID in their database filter.

```text
src/
  app/              storefront, account, checkout, order, admin, and API routes
  components/       layout, catalog, cart, checkout, auth, and admin UI
  lib/              Prisma, auth, money, payment, validation, and rate-limit helpers
prisma/             Prisma schema and development seed
tests/              unit, optional database integration, and Playwright coverage
docs/               database, API, deployment, architecture, and security
```
