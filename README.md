# Demo Seller Marketplace

A mobile-friendly furniture marketplace prototype built with Next.js. The seeded
Prague divan product is test content with original illustrations; no reference
store branding or product photography is included.

## Run locally

```bash
npm install
npm run dev
```

The app uses Supabase as its only database. Configure the server environment
before running the app; database requests fail with a configuration error when
the required credentials are missing.

## Configure the shared Supabase database

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard).
   Choose the project name and database region appropriate for your deployment.
2. Open **SQL Editor**, paste and run
   [`supabase/migrations/20261125120000_marketplace.sql`](./supabase/migrations/20261125120000_marketplace.sql).
   The migration creates the marketplace tables, enables row-level security,
   limits public database access to approved listings, creates a public
   product-image bucket, and seeds the sample bed and its numeric price options.
3. Copy `.env.example` to `.env.local`. In **Project Settings → API Keys**, copy
   the **Project URL** into `SUPABASE_URL` and a server-only **Secret key** into
   `SUPABASE_SECRET_KEY`. The legacy `service_role` key can be used as
   `SUPABASE_SERVICE_ROLE_KEY` instead. Never use either server key in a
   `NEXT_PUBLIC_` variable, browser code, or a committed file.
4. Generate a one-time bootstrap token on your machine:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Put the result in `MARKETPLACE_ADMIN_BOOTSTRAP_TOKEN` in `.env.local`, then
   restart the Next.js server.
5. Create the first admin account using PowerShell. Use a password with at
   least 12 characters:

   ```powershell
   $token = Read-Host "Bootstrap token"
   $email = Read-Host "Admin email"
   $password = Read-Host "Admin password"
   $body = @{
     action = "bootstrap-admin"
     token = $token
     name = "Marketplace Admin"
     email = $email
     password = $password
   } | ConvertTo-Json
   Invoke-RestMethod -Uri "http://localhost:3000/api/auth" -Method Post -ContentType "application/json" -Body $body -SessionVariable marketplaceSession
   ```

   After the first admin is created, remove
   `MARKETPLACE_ADMIN_BOOTSTRAP_TOKEN` from `.env.local` and restart the server.
   The endpoint will also refuse to create a second admin.

The app uses the Supabase server-side secret key only in API routes. Passwords
are hashed before storage; browser sessions are random, HTTP-only tokens whose
hashes are stored in the database. Product-option prices are stored as numeric
values. Seller uploads are resized in the browser and stored in the private-to-
the-server `product-images` upload workflow; listing photos are publicly
readable from the configured public bucket.

## Check the app

```bash
npm run lint
npx tsc --noEmit
npm run build
```
