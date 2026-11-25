# Demo Seller mobile app

An Expo and React Native client for the Next.js marketplace in `../my-app`. It uses that app's API and database for the catalogue, account sessions, and orders. The app uses the same product option schema and API-side order price calculation as the web client.

## Run locally

```bash
npm install
npx expo start
```

Use Expo Go or a development build to open the app on a device. Press `w` in the Expo terminal to open the web version.

## Connect to the web marketplace

Set `EXPO_PUBLIC_MARKETPLACE_API_URL` to the origin serving `my-app`, for example `http://192.168.1.20:3000` for a physical phone on the same Wi-Fi, or `http://localhost:3000` for a simulator. **Do not use the Supabase project URL here**: the mobile app must call the Next.js API, which talks to Supabase server-side. Create `mobile-app/.env` containing:

```dotenv
EXPO_PUBLIC_MARKETPLACE_API_URL=http://192.168.1.20:3000
```

Start the web app with `cd ../my-app; npm run dev`, then start Expo. The API must be reachable from the device. For deployed use, configure the public URL of the deployed web API. The mobile app only receives this public origin; Supabase secret keys and password hashing remain server-side in `my-app`.

## Shared marketplace flow

1. The catalogue and product choices load from `GET /api/products`.
2. Product options and displayed totals use the marketplace's stored size, storage, headboard, base, and assembly prices.
3. Sign in or create a buyer/seller account through `POST /api/auth`.
4. The basket is saved locally on the device, as in the web app.
5. Buyer checkout posts selected options and delivery address to `POST /api/orders`; the server validates the options and calculates the order total from the shared database.
6. Order history loads from `GET /api/orders`.

The API currently authenticates with an HTTP-only browser session cookie. Native cookie persistence varies by platform; confirm session retention on target devices. Do not move the Supabase server key into the mobile app. If native cookie behavior is insufficient, add a dedicated short-lived bearer-token flow to the web API before production use.

## Data and backend

The web app owns the shared API and Supabase database. Use `my-app/README.md` for database configuration. The app's basket is device-local; accounts, catalogue, and orders use the web app's shared API/database.

## Status

Implemented: responsive mobile storefront, API-backed searchable catalogue, all shared product options, live prices, local basket, API-backed buyer/seller signup and sign-in, server-validated buyer checkout, and API-backed order list.

Not implemented: native seller listing editor/admin screens, push notifications, payments, and production deployment. The API has seller and admin functionality through the web app. No real customer data is included. Authentication cookie behavior should be checked in native builds.
