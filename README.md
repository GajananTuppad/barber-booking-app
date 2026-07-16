# Shravkash — Barber Booking Platform

A monorepo barber-booking platform: a customer + barber mobile app (Expo/React
Native), an admin web panel (Next.js), a shared tRPC backend, and Supabase
(Postgres + Auth + Storage + Realtime + Edge Functions) for infrastructure.

## Architecture

```
                                   ┌─────────────────────┐
                                   │   Supabase Project   │
                                   │ ─────────────────────│
                                   │ Postgres (RLS)        │
                                   │ Auth                  │
                                   │ Storage (avatars)      │
                                   │ Realtime (slots,       │
                                   │   bookings,            │
                                   │   notifications)       │
                                   │ pg_cron (reminders)    │
                                   └──────────▲─────────────┘
                                              │
                        ┌─────────────────────┼──────────────────────┐
                        │                     │                      │
              ┌─────────┴─────────┐  ┌────────┴─────────┐  ┌─────────┴─────────┐
              │  Edge Functions    │  │  apps/web (Next)  │  │ apps/mobile (Expo) │
              │  (Deno)            │  │ ──────────────────│  │ ───────────────────│
              │ ────────────────── │  │ /api/trpc/[trpc]  │  │ (auth) splash/     │
              │ book-slot          │  │  → appRouter       │  │   login/signup     │
              │ confirm-booking    │  │ (admin)/*          │  │ (customer)/*       │
              │ cancel-booking     │  │  Overview, Salons, │  │   home, explore,   │
              │ release-slot       │  │  Barbers, Users,   │  │   barber profile,  │
              │ generate-          │  │  Payouts           │  │   booking flow     │
              │   availability     │  │ middleware.ts      │  │ (barber)/*         │
              │ send-reminders     │  │  (role gate)        │  │   dashboard,       │
              │  (pg_cron target)  │  │                     │  │   calendar, slots, │
              │                    │  │                     │  │   bookings, profile│
              └────────┬───────────┘  └─────────┬──────────┘  │   earnings         │
                       │                         │             └─────────┬──────────┘
                       │                         │                       │
                       │              tRPC over HTTP (httpBatchLink)     │
                       │              ◄─────────────────────────────────┘
                       │
              ┌────────┴───────────┐
              │  Upstash Redis      │   slot locks, rate limiting
              ├─────────────────────┤
              │  Razorpay           │   payments + refunds
              ├─────────────────────┤
              │  Resend             │   transactional email
              ├─────────────────────┤
              │  MSG91               │   WhatsApp notifications
              ├─────────────────────┤
              │  Expo Push           │   mobile push notifications
              └─────────────────────┘
```

### Packages

| Path                  | What                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `apps/mobile`         | Expo Router app — customer + barber flows, NativeWind (dark/gold)                                            |
| `apps/web`            | Next.js 14 App Router — tRPC HTTP adapter + the admin panel                                                   |
| `packages/shared`     | tRPC routers, Zod schemas, Supabase types/clients, notification/push libs, pure utils (tested with vitest)    |
| `supabase/migrations` | SQL migrations — schema, RLS, realtime, cron, indexes                                                         |
| `supabase/functions`  | Deno Edge Functions — payment flow, notifications, rate limiting                                              |

### Request flow (booking a slot)

1. Mobile calls tRPC (`apps/mobile` → `apps/web/app/api/trpc/[trpc]/route.ts` → `packages/shared` routers), authenticated via the Supabase session JWT.
2. Payment-critical writes go through Edge Functions instead of tRPC, so they can call Razorpay and use the service-role key: `book-slot` (locks the slot in Redis + Postgres atomically, creates a Razorpay order) → Razorpay Checkout on-device → `confirm-booking` (verifies the payment signature, inserts the booking, notifies the barber) or, on failure, `release-slot` (frees the lock).
3. `pg_cron` hits `send-reminders` every 15 minutes for bookings starting soon.
4. `confirm-booking` / `cancel-booking` / `send-reminders` all write to the `notifications` table (in-app bell, Realtime) and best-effort push via Expo.

## Local development

Prerequisites: Node 24, pnpm, the [Supabase CLI](https://supabase.com/docs/guides/cli), and Docker (for `supabase start`).

```bash
nvm use 24
pnpm install

# Start local Postgres/Auth/Storage/Realtime + apply migrations + seed data
supabase start

# Copy env vars (see reference below) into .env at the repo root,
# apps/web/.env.local, and apps/mobile/.env — `supabase start` prints the
# local URL/anon key/service role key to fill these in with.
cp .env.example .env

# Run every app's dev server via Turborepo
pnpm dev
```

Individual commands, run from the repo root (Turborepo fans these out to every workspace that defines the script):

```bash
pnpm type-check   # tsc --noEmit everywhere
pnpm lint         # eslint / next lint everywhere
pnpm test         # vitest unit tests (packages/shared)
```

To deploy Edge Functions to your Supabase project locally:

```bash
supabase functions deploy
```

Mobile-specific:

```bash
cd apps/mobile
pnpm dev          # expo start

# react-native-maps and react-native-razorpay are native modules not present
# in Expo Go — building a custom dev client is required to run the app:
eas build --profile development --platform ios   # or android
```

## Environment variables

Set in `.env` (repo root, read by Edge Functions when running locally),
`apps/web/.env.local`, and `apps/mobile/.env` as applicable — see
`.env.example` for the full list.

| Variable                                                       | Used by                            | Notes                                                        |
| --------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY`                         | web                                 | Public — safe to ship to the browser                             |
| `EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY`                         | mobile                              | Public — safe to ship in the app bundle                          |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY`                             | edge functions                      | Auto-injected by the Supabase Edge Runtime at deploy             |
| `SUPABASE_SERVICE_ROLE_KEY`                                      | web (server-only), edge functions   | **Never** exposed to any client bundle — see Security below      |
| `EXPO_PUBLIC_API_URL`                                            | mobile                              | Origin of the deployed `apps/web` (tRPC transport)               |
| `UPSTASH_REDIS_URL` / `_TOKEN`                                   | edge functions                      | Slot locks + rate limiting                                       |
| `RAZORPAY_KEY_ID` / `_SECRET`, `EXPO_PUBLIC_RAZORPAY_KEY_ID`     | edge functions, mobile              | Payments                                                          |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL`                           | edge functions                      | Transactional email                                               |
| `MSG91_AUTH_KEY` / `_INTEGRATED_NUMBER` / `_NAMESPACE`           | edge functions                      | WhatsApp notifications                                            |
| `GOOGLE_MAPS_IOS_API_KEY` / `_ANDROID_API_KEY`                   | mobile (`app.json`)                 | Native maps SDK                                                   |

GitHub Actions secrets (CI/CD, not app env vars): `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
`VERCEL_PROJECT_ID`, `EXPO_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`.

## Deployment

CI/CD lives in `.github/workflows/`:

- **`ci.yml`** — typecheck / lint / test on every push to `main` and every PR.
- **`deploy-web.yml`** — on push to `main` touching `apps/web/**`: builds and deploys `apps/web` to Vercel production via the Vercel CLI (`vercel pull` → `vercel build` → `vercel deploy --prebuilt`).
- **`deploy-mobile.yml`** — on push to `main` touching `apps/mobile/**`: kicks off `eas build --platform all --non-interactive` (async — track it at expo.dev).
- **`deploy-functions.yml`** — on push to `main` touching `supabase/functions/**`: `supabase functions deploy`.

### One-time setup per environment

1. **Supabase**: create a project, run `supabase link --project-ref <ref>`, then `supabase db push` (or apply `supabase/migrations/*.sql` in order) and `supabase functions deploy`. Set the Edge Function secrets (Redis, Razorpay, Resend, MSG91) via `supabase secrets set`.
2. **Vercel**: `vercel link` inside `apps/web`, set the `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY` env vars in the Vercel project settings, and add `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` as GitHub secrets.
3. **EAS**: `eas login`, `eas build:configure` inside `apps/mobile`, and add `EXPO_TOKEN` (an Expo access token) as a GitHub secret.

## Security

- Every table has row-level security enabled (`supabase/migrations/002_rls.sql`, `007_barber_admin.sql`, `008_notifications.sql`) — audited by cross-checking every `create table` against a matching `enable row level security` statement.
- `SUPABASE_SERVICE_ROLE_KEY` is read only in `apps/web/lib/supabase-admin.ts` (guarded with the `server-only` package, so importing it from a Client Component fails the build) and inside Edge Functions (Deno, server-side only). It is never read behind a `NEXT_PUBLIC_`/`EXPO_PUBLIC_` prefix.
- The admin panel is gated by `apps/web/middleware.ts`, which checks `profiles.role === 'admin'` on every request.
- Edge Functions rate-limit by client IP via Redis (`supabase/functions/_shared/rate-limit.ts`).
- `book-slot` locks a slot via Redis **and** an atomic Postgres `UPDATE ... WHERE status = 'available'` (`try_lock_slot`, migration `009`), so two concurrent bookings can never both win the same slot.

## Known gaps / follow-ups

- **App icons/splash**: `apps/mobile/assets/` currently contains solid-color placeholder PNGs (generated programmatically, not real artwork) so `eas build` has valid files to reference — swap these for real designed assets before an App Store/Play Store submission.
- **iOS privacy manifest**: `app.json` declares a minimal `privacyManifests` entry; review it against whichever native SDKs are actually linked once the app is prebuilt, per Apple's iOS 17+ requirement.
- **Route collision on deep links**: `(customer)/bookings/[id]` and `(barber)/bookings/[id]` share the same bare pathname (Expo Router groups don't affect the URL). In-app navigation and push-notification taps always use the role-qualified path, but a raw OS-level deep link to `/bookings/:id` without app context is inherently ambiguous — not an issue in practice today since the only place a bookings link is currently generated is inside the app itself.
