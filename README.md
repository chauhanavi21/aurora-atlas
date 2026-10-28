# Aurora Atlas

A clothing storefront with a Node.js backend, local SQLite database, customer accounts, guest checkout, inventory management, and authenticated store administration. The homepage keeps its Three.js jacket; shopping pages use real reference photographs.

## Run locally

Requires **Node.js 24+**. From this directory in PowerShell:

~~~powershell
npm.cmd ci
npm.cmd run admin:create
npm.cmd start
~~~

Open **http://localhost:3000**. The frontend and API run together at this address. Use this app server instead of the old Python static server. Runtime code uses Node's built-in HTTP, crypto, and SQLite libraries; happy-dom is a development dependency for tests.

First-time admin setup generates a strong random password in **.data/admin-credentials.txt**. Open that private file to sign in at **http://localhost:3000/admin.html**. The file and database are excluded from Git and blocked by the web server. Existing passwords are never overwritten. For a different first-time owner email, use:

~~~powershell
npm.cmd run admin:create -- owner@example.com
~~~

An administrator may already exist in this workspace; use the existing credentials file in that case. Use **npm.cmd run dev** for automatic backend restarts, and Ctrl+C to stop. Copy **.env.example** to **.env** to change settings; defaults work without an .env file. Never commit .env.

## What works

- Database catalog with 20 sample products and stock for every color and size.
- Search, categories, sorting, photo galleries, zoom, dedicated product pages, and live availability.
- Customer signup, sign-in, sign-out, profile names, password changes, local password recovery, and private order history.
- Server-persisted bags tied to HttpOnly session cookies, with prices loaded from the API. Account bags persist across devices; signing in merges a guest bag within stock limits. Valid pre-backend guest bags are imported once.
- Checkout with validated US delivery details, server-calculated USD totals, shipping, configured tax, and **cash on delivery enabled by default**.
- Saved order confirmations restricted to the customer's account or original guest session. Repeated checkout submissions return the same order, including after signing back in.
- Atomic stock deductions, rollback on insufficient stock, and stock restoration on cancellation or reservation expiry.
- Admin login, latest 100 orders, fulfillment, COD cancellation, prices, available inventory, subscriber list, and an audit log of changes.
- Database-persisted newsletter signups with explicit consent and duplicate prevention.
- Stripe Checkout integration, hidden until both private keys are configured.

The admin COD fulfillment action confirms **delivery is complete and payment has been collected**. Confirmed COD orders can be cancelled with stock restoration. Paid online orders can be marked fulfilled; refunds must be managed through Stripe. A late payment after a reservation was cancelled becomes **payment_review**, never automatic fulfillment.

Guest confirmations remain available in the ordering browser for the session's 30-day lifetime. Accounts, bags, orders, and newsletter records survive server restarts. Confirmation emails and marketing messages are not sent automatically.

## Customer accounts

Open **http://localhost:3000/signup.html** to create an account, **/login.html** to sign in, and **/account.html** for profile details, order history, password changes, and sign-out. The store header and checkout link to these pages. Checkout also works without an account; signing in or creating an account attaches only that browser's guest orders, never unrelated orders with a matching email address.

Names, email addresses, password length/strength, and confirmation are validated in the form and again by the API. Email addresses are normalized and unique without case sensitivity. Passwords accept 12–128 Unicode characters, preserve spaces, and reject common or email-based choices. Each password gets its own salt and scrypt hash; plaintext passwords are never saved. Email ownership verification and email changes are not implemented.

Customer sessions last 12 hours, or 30 days with **Keep me signed in**. Session secrets stay in HttpOnly, SameSite cookies, with only their hashes in SQLite. Login, logout, and password changes rotate the session and CSRF token. Password changes require the current password and revoke other devices. Failed logins have IP and persistent account limits. Signing out clears that browser's account access while saving its account bag for the next login.

**Local password recovery:** request a link at **/forgot-password.html**. In development, the server writes a private JSON message containing the link to **.data/mail-outbox/**. The store owner opens that file locally and uses its `resetUrl`; no email is sent. Links expire after 30 minutes, work once, and revoke all customer sessions when used. Only token hashes enter SQLite, and the API never returns recovery secrets. The outbox is ignored by Git and inaccessible over HTTP. Set `AUTH_LOCAL_RECOVERY=false` to disable it. Production disables this local mechanism; automatic recovery requires connecting a delivery adapter in `createApp` dependencies.

## Payments and delivery

COD records an order without collecting an online payment. The full amount is due on delivery. Standard US shipping defaults to **$9.95**, free from **$150**. Subtotal, shipping, tax, and total appear before submitting.

To connect Stripe later:

1. Put your **test** secret key in STRIPE_SECRET_KEY in .env.
2. Forward webhooks with the Stripe CLI, for example: **stripe listen --forward-to localhost:3000/api/webhooks/stripe**.
3. Put that signing secret in STRIPE_WEBHOOK_SECRET, then restart.
4. Subscribe to **checkout.session.completed** and **checkout.session.expired**. Test the full payment and webhook flow before changing to live keys.

Cards and supported card wallets use Stripe's hosted checkout; card data never passes through this server. A redirect does not mark an order paid. A signed webhook must match the order metadata, currency, and amount; events are deduplicated. Interrupted checkouts can be resumed or cancelled. Reservations last about 30 minutes, with a short webhook-delivery margin.

**TAX_RATE_BPS** is a single merchandise tax percentage in basis points: 825 means 8.25%. It defaults to zero and is **not a jurisdiction-aware tax engine**. Configure applicable tax rules and shipping tax treatment before live sales. Carrier booking, collecting COD funds, email receipts, and returns remain operational responsibilities; this backend records and manages the orders.

## Database and public hosting

The database is **.data/aurora.sqlite**, stored on this computer; no external database or authentication service is required. The account migration adds customer, bag, and recovery tables while preserving the existing catalog, orders, sessions, and admin. Missing products/options are seeded from catalog.js; restarting never resets saved prices or stock. **Initial stock of 20 per variant is illustrative. Set actual inventory before selling.** Prices and totals use integer cents.

Use a Node host with persistent disk storage. GitHub Pages and other static-only hosting cannot run this backend. Before public deployment:

- Set NODE_ENV=production and an HTTPS PUBLIC_URL; terminate TLS at the host or reverse proxy. Set HOST and PORT for your platform.
- Keep .env, .data, backups, and administrator credentials private. Use production-specific accounts and keys.
- Back up with SQLite tooling, or stop the server before copying the database. Do not ignore live WAL files.
- Configure actual stock, approved photos, taxes, shipping/returns, support contacts, and payment settings.

Only explicitly public files are served. Source, secrets, databases, and dependencies are inaccessible from the website. Writes use session-bound CSRF tokens and origin checks. Admin login is rate limited; passwords use scrypt; sessions rotate on login; production cookies require HTTPS. This SQLite setup is for a single application instance; multi-host deployment needs shared database and session infrastructure.

## Verify

~~~powershell
npm.cmd test
~~~

API and DOM integration tests use isolated real servers and in-memory databases; migration/restart tests use temporary SQLite files. They cover signup validation and duplicate races, salted password hashes, session rotation, account isolation, bag merging, password changes, private single-use recovery, throttling, database migration, and the full account forms. Commerce coverage includes server pricing, stock races, duplicate orders, private orders, admin authorization, CSRF/origin checks, Stripe signatures and duplicate webhooks, newsletter consent, all 43 photos, filters, checkout confirmation, admin pricing/stock, and sold-out controls. Test accounts and orders never enter the running store's database.

For Chrome layout checks, start the app and run:

~~~powershell
node scripts/verify.mjs
~~~

Chrome must be installed at the standard Windows path. PREVIEW_URL can override the default address. Browser checks use a fresh profile, save screenshots under screenshots/, and can create a sample newsletter signup in the running store. DOM checks do not verify layout, and existing screenshots do not prove a new browser run.

## Photography and catalog

The 43 local images are **UNIQLO reference photography**, not Aurora Atlas inventory photos. Credits and URLs are in **assets/photos/sources.json**; product pages disclose their use. Rights remain with their owners. Use your own approved product photos for commercial sales. Gallery details are labeled crops of the selected color's photo.

Catalog.js supplies initial product definitions and photo paths. Database prices and stock drive the running store. Add new product definitions and matching **assets/photos/<id>-<color>-front.jpg** files, then restart to seed new options. Add category filters/navigation when needed.

**node scripts/download-photos.mjs** restores missing reference photos. Pass a product ID to download one item, or --refresh to replace cached files. The complete source manifest is written only when every listed photo exists.
