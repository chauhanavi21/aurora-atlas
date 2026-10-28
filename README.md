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

- Database catalog with **70 sample products** (the original 20 plus 50 additional apparel, footwear, and accessories) and 191 locally saved product photographs.
- Search, categories, sorting, photo galleries, zoom, dedicated product pages, and live availability.
- Customer signup, sign-in, sign-out, profile names, password changes, local password recovery, and private order history.
- Server-persisted bags tied to HttpOnly session cookies, with prices loaded from the API. Account bags persist across devices; signing in merges a guest bag within stock limits. Valid pre-backend guest bags are imported once.
- Checkout with validated US delivery details, server-calculated USD totals, shipping, configured tax, and **cash on delivery enabled by default**.
- Saved order confirmations restricted to the customer's account or original guest session. Repeated checkout submissions return the same order, including after signing back in.
- Atomic stock deductions, rollback on insufficient stock, and stock restoration on cancellation or reservation expiry.
- Admin dashboard for product creation/editing, photo uploads, publication, all variant stock, prices, searchable orders/customers, shipping/tracking, subscribers, store content/settings, and activity history.
- Database-persisted newsletter signups with explicit consent and duplicate prevention.
- Stripe Checkout integration, hidden until both private keys are configured.

The admin COD fulfillment action confirms **delivery is complete and payment has been collected**. Marking an order shipped does not collect payment. Confirmed COD orders can be cancelled with stock restoration. Paid online orders can be marked fulfilled; refunds must be managed through Stripe. A late payment after a reservation was cancelled becomes **payment_review**; an admin can approve it only after the server successfully reserves inventory again.

Guest confirmations remain available in the ordering browser for the session's 30-day lifetime. Accounts, bags, orders, and newsletter records survive server restarts. Confirmation emails and marketing messages are not sent automatically.

## Store administration

Open **http://localhost:3000/admin.html** and use the private **.data/admin-credentials.txt** created during setup. This file contains the initial password; after changing it in the dashboard, use your new password. Customer accounts cannot access store management. Admin sessions expire after 12 hours, and every write requires a CSRF token and an allowed origin.

- **Products:** search all published/draft/archived products; create new products; edit names, descriptions, categories, features, care, sizes, colors, badges, prices, and photography. Product IDs are permanent. Publish/unpublish controls visibility without losing historical orders. Old option rows remain private so cancellations can restore stock safely.
- **Photos:** upload up to three JPEG, PNG, or WebP images per color, each up to 2 MB. Photos are stored in **.data/uploads/** and served only through generated **/media/** URLs. You can also reuse an existing local photo path. Uploaded photos are not committed to Git; include them in your store backups.
- **Inventory & pricing:** find a product, choose any option, and update its available quantity and price. Low-stock and sold-out filters help locate options. The full product editor changes all variant quantities together. New options start at zero until stock is entered. Stock is never reserved merely by adding to a bag.
- **Orders:** search by reference/customer, filter by status, and page through all orders. Save tracking details visible to the customer and internal notes visible only to admins. Mark orders shipped or delivered; COD delivery requires confirmation that payment was collected. Cancel unshipped COD orders to restore inventory. Order line items and totals preserve their checkout values.
- **Customers:** search accounts, correct names, find their orders, revoke all sessions, and disable/enable account access. Disabling an account also revokes recovery links; it preserves its order history. Email ownership changes are unavailable.
- **Field notes:** search, paginate, remove subscribers, and export all subscribers to CSV. The export protects against spreadsheet formulas. Messages are not sent automatically.
- **Store & homepage:** edit announcements, hero/story/newsletter copy, featured products, footer tagline, support email, shipping/return/care information, free-shipping threshold, delivery charges, tax, COD availability, and checkout/subscription switches. Archived featured products stay hidden. Changes appear on the next storefront page load; checkout recalculates saved settings and rejects outdated totals.
- **Activity & security:** browse a persistent record of admin changes and change your administrator password. A password change signs out other admin sessions.

Store settings are saved in SQLite. Shipping, tax, COD, and support values in .env are initial defaults; later edits belong in the dashboard. Stripe secrets, server ports, and database paths remain private server configuration. The dashboard does not book carriers, send emails, or collect COD funds on your behalf.

## Customer accounts

Open **http://localhost:3000/signup.html** to create an account, **/login.html** to sign in, and **/account.html** for profile details, order history, password changes, and sign-out. The store header and checkout link to these pages. Checkout also works without an account; signing in or creating an account attaches only that browser's guest orders, never unrelated orders with a matching email address.

Names, email addresses, password length/strength, and confirmation are validated in the form and again by the API. Email addresses are normalized and unique without case sensitivity. Passwords accept 12–128 Unicode characters, preserve spaces, and reject common or email-based choices. Each password gets its own salt and scrypt hash; plaintext passwords are never saved. Email ownership verification and email changes are not implemented.

Customer sessions last 12 hours, or 30 days with **Keep me signed in**. Session secrets stay in HttpOnly, SameSite cookies, with only their hashes in SQLite. Login, logout, and password changes rotate the session and CSRF token. Password changes require the current password and revoke other devices. Failed logins have IP and persistent account limits. Signing out clears that browser's account access while saving its account bag for the next login.

**Local password recovery:** request a link at **/forgot-password.html**. In development, the server writes a private JSON message containing the link to **.data/mail-outbox/**. The store owner opens that file locally and uses its `resetUrl`; no email is sent. Links expire after 30 minutes, work once, and revoke all customer sessions when used. Only token hashes enter SQLite, and the API never returns recovery secrets. The outbox is ignored by Git and inaccessible over HTTP. Set `AUTH_LOCAL_RECOVERY=false` to disable it. Production disables this local mechanism; automatic recovery requires connecting a delivery adapter in `createApp` dependencies.

## Payments and delivery

COD records an order without collecting an online payment. The full amount is due on delivery. Standard US shipping initially defaults to **$9.95**, free from **$150**; the admin dashboard controls saved delivery rates. Subtotal, shipping, tax, and total appear before submitting.

To connect Stripe later:

1. Put your **test** secret key in STRIPE_SECRET_KEY in .env.
2. Forward webhooks with the Stripe CLI, for example: **stripe listen --forward-to localhost:3000/api/webhooks/stripe**.
3. Put that signing secret in STRIPE_WEBHOOK_SECRET, then restart.
4. Subscribe to **checkout.session.completed** and **checkout.session.expired**. Test the full payment and webhook flow before changing to live keys.

Cards and supported card wallets use Stripe's hosted checkout; card data never passes through this server. A redirect does not mark an order paid. A signed webhook must match the order metadata, currency, and amount; events are deduplicated. Interrupted checkouts can be resumed or cancelled. Reservations last about 30 minutes, with a short webhook-delivery margin.

**TAX_RATE_BPS** is a single merchandise tax percentage in basis points: 825 means 8.25%. It defaults to zero and is **not a jurisdiction-aware tax engine**. Configure applicable tax rules and shipping tax treatment before live sales. Carrier booking, collecting COD funds, email receipts, and returns remain operational responsibilities; this backend records and manages the orders.

## Database and public hosting

The database is **.data/aurora.sqlite**, stored on this computer; no external database or authentication service is required. Automatic migrations preserve the existing catalog, accounts, orders, sessions, and admin while adding management settings, product versions, account status, and tracking. Missing products are seeded from catalog.js once, with their initial options. Restarting never resets admin changes or recreates retired options. **Initial stock of 20 per sample variant is illustrative. Set actual inventory before selling.** Prices and totals use integer cents.

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

API and DOM integration tests use isolated real servers and in-memory databases; migration/restart and upload tests use temporary files. Coverage includes authentication, account isolation, all 70 products and 191 photos, product creation/editing/publication, image uploads, archived products, retired variants, stock races, duplicate orders, server pricing, store settings, private notes/tracking, customer controls, subscriber pagination, admin password changes, CSRF/origin checks, and signed Stripe webhooks. Tests exercise dashboard forms through the real API, including escaped product/content text. Test accounts and orders never enter the running store's database.

For Chrome layout checks, start the app and run:

~~~powershell
node scripts/verify.mjs
~~~

Chrome must be installed at the standard Windows path. PREVIEW_URL can override the default address. Browser checks use a fresh profile, save screenshots under screenshots/, and can create a sample newsletter signup in the running store. DOM checks do not verify layout, and existing screenshots do not prove a new browser run.

## Photography and catalog

The original 43 images are **UNIQLO reference photography**; the 50 additions use 148 product photos from **DummyJSON**, with credit manifests in **assets/photos/sources.json** and **assets/photos/sample-sources.json**. These are sample listings, not Aurora Atlas inventory photos. Product pages disclose reference use. Rights remain with their owners; use your own approved product photos for commercial sales. New sample listings show their actual alternate views, while missing extra views fall back to labeled crops. The "As pictured" option avoids inventing color variants for a reference photograph.

Catalog.js supplies initial product definitions and photo paths. The database drives the running catalog, prices, stock, publication state, and settings. Use the product editor to add products without editing source files. Categories include outerwear, essentials, bottoms, accessories, and footwear; shoe products have their own size guidance.

**node scripts/download-photos.mjs** restores missing reference photos. Pass a product ID to download one item, or --refresh to replace cached files. The complete source manifest is written only when every listed photo exists.

**node scripts/import-samples.mjs** restores the 50 additional sample records and their locally cached photographs from DummyJSON. It updates only the marked sample block in catalog.js and its credit manifest. Existing database products are preserved when the server restarts, so this command does not overwrite admin edits.
