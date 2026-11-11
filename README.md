# AP Solutions ECU Portal — Railway deployment starter (V2)

**Status:** deployable starter, **not production security-certified**. The project was generated for Railway/PostgreSQL/private S3 storage and Shopify webhook verification. No live hosting, migrations, integrations or production tests have been performed here.

## Included
- Next.js dealer dashboard and administrator dashboard
- Login using bcrypt password hashes, 8-hour signed HTTP-only session cookies
- Admin-created dealer accounts
- PostgreSQL schema and migrations
- Private S3-compatible storage for ECU files; authorized server-mediated downloads
- 20 MB file limit, extension allowlist, generated object keys
- Shopify `orders/paid` webhook: validates raw-body HMAC and logs idempotent event; **does not award credits**
- Railway deployment configuration and health route

## Before deployment
1. Create **private GitHub repository**. Upload these files (not `.env`).
2. In Railway create project > PostgreSQL service > application service from GitHub repo.
3. In Railway app service Variables set `DATABASE_URL` to `${{Postgres.DATABASE_URL}}` (adapt service name), plus `SESSION_SECRET` (random 64+ chars) and private S3 credentials from your storage provider. Use a private bucket. See `.env.example`.
4. Set `SHOPIFY_SHOP_DOMAIN=espqp7-e1.myshopify.com`. Only set `SHOPIFY_WEBHOOK_SECRET` when you have created and authorized a Shopify app/webhook for the correct store. Register `https://YOUR-RAILWAY-URL/api/shopify/webhook` for `orders/paid` in the Shopify app configuration. This endpoint records paid events; it **does not** connect customer accounts or credits.
5. In Railway application shell/job run `npm run db:migrate` once. Then set `ADMIN_EMAIL`, `ADMIN_PASSWORD` (16+ chars) and run `npm run admin:create` once. Remove `ADMIN_PASSWORD` afterwards. Do not put secrets in chat or Git.
6. Deploy, verify `/api/health`, then sign in at `/login`. Create dealers at `/admin/dealers`.
7. Add a Shopify navigation link to your Railway-generated HTTPS address. The `myshopify.com` domain remains on Shopify; Railway uses its own domain until you buy/connect a custom one.

## Local development
`npm install`, configure `.env.local` with PostgreSQL and S3, then `npm run db:migrate`, `npm run admin:create`, `npm run dev`.

## Security work required before customer launch
- Set up private bucket encryption, lifecycle retention, access logging, backups and restore testing; GDPR data processing agreements.
- Add malware scanning and ZIP archive inspection (extension allowlist alone is not file validation), upload rate limits, and file size limits at reverse proxy.
- Add authentication rate limiting, account lockouts, MFA for admin, password reset and secure dealer onboarding (temporary passwords currently manual).
- Add CSRF tokens, full audit logging, security monitoring and vulnerability/dependency scanning; existing same-origin checks are a baseline only.
- Test authorization, tenant isolation, file download, database backups, Railway deployments, and end-to-end Shopify webhook delivery.
- Shopify credit sales require a **separate verified mapping** between paid Shopify customer/order and dealer identity, eligible variants, refunds and credit ledger. This starter intentionally does **not** credit balances or charge for orders.
- Validate calibration services for vehicle/road safety, applicable regulations and authorization.

## Notes
Railway service needs outbound S3 access; do not store ECU files on ephemeral Railway disk. Database and object storage cost money. Shopify store may need a paid plan to sell products.
