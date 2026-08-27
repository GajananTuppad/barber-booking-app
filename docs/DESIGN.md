# Shravkash — Barber Booking Platform
## Design Document

> **Version:** 1.0 — August 2026  
> **Authors:** Engineering Team  
> **Status:** Current

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Data Model](#4-data-model)
5. [API Design](#5-api-design)
6. [Feature Specifications](#6-feature-specifications)
7. [Security Model](#7-security-model)
8. [Infrastructure & DevOps](#8-infrastructure--devops)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Future Considerations](#10-future-considerations)

---

## 1. Overview

### 1.1 Purpose

Shravkash is a full-stack barber booking platform enabling customers to discover, book, and pay for barber appointments — and barbers to manage their schedules, earnings, and client relationships. A web-based admin panel provides platform-wide oversight.

### 1.2 Users & Roles

| Role       | Description                                      |
|------------|--------------------------------------------------|
| `customer` | Browses barbers, books appointments, pays online |
| `barber`   | Manages profile, slots, bookings, and earnings    |
| `admin`    | Full platform oversight via the web admin panel   |

### 1.3 Core User Flows

**Customer:**
```
Browse barbers → Select barber → Choose service → Pick date/slot → Biometric confirm → Pay via Razorpay → Receive confirmation + reminders
```

**Barber:**
```
Set weekly schedule → Slots auto-generated → Receive booking → View customer details → Mark complete → Track earnings → View payouts
```

**Admin:**
```
Login → View dashboard → Manage barbers / salons / users / payouts
```

---

## 2. Architecture

### 2.1 System Context

Shravkash is a **3-client / 3-service** system:

| Client        | Platform         | Renderer           |
|---------------|------------------|--------------------|
| Customer App  | Expo (React Native) | Native mobile UI   |
| Barber App    | Expo (React Native) | Native mobile UI   |
| Admin Panel   | Next.js (Web)       | React SSR          |

All clients communicate through a shared API layer (tRPC + Supabase).

### 2.2 Container Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLIENTS                          │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────┐ │
│  │ Customer App │ │  Barber App  │ │Admin Panel │ │
│  │  (Expo/RN)   │ │  (Expo/RN)   │ │ (Next.js)  │ │
│  └──────┬───────┘ └──────┬───────┘ └─────┬─────┘ │
│         │                 │               │        │
└─────────┼─────────────────┼───────────────┼────────┘
          │                 │               │
          ▼                 │               ▼
┌─────────────────────────────────────────────────────┐
│               API GATEWAY                           │
│  tRPC Router (Next.js API route handler)           │
│  POST/GET /api/trpc/[trpc]                         │
│  Bearer token auth via Supabase JWT                │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
┌─────────────────┐    ┌─────────────────────────┐
│ SUPABASE         │    │ EDGE FUNCTIONS           │
│ �─ PostgreSQL    │    │ (Deno / Supabase Edge)   │
│ �─ Auth          │    │ ┌─────────────────────┐  │
│ �─ Realtime      │    │ │ book-slot           │  │
│ �─ Storage       │    │ │ confirm-booking     │  │
│ �─ pg_cron        │    │ │ cancel-booking      │  │
│ �─ RLS            │    │ │ release-slot        │  │
└─────────────────┘    │ │ generate-availability│  │
                        │ │ send-reminders       │  │
                        │ └─────────────────────┘  │
                        └───────────────────────────┘
```

### 2.3 External Service Dependencies

| Service         | Purpose                                          |
|-----------------|--------------------------------------------------|
| Upstash Redis   | Distributed slot locking, rate limiting          |
| Razorpay        | Payment gateway (checkout, order, verification)  |
| Resend          | Transactional email delivery                     |
| Expo Push       | Mobile push notifications                        |
| MSG91           | WhatsApp / SMS notifications                     |
| Google Maps SDK | Location-based barber discovery on mobile       |

---

## 3. Tech Stack

### 3.1 Monorepo Structure

```
barber-booking-app/               ← pnpm workspace root (Turborepo)
├── apps/
│   ├── web/                     # Next.js 14 admin panel
│   └── mobile/                  # Expo/React Native customer + barber app
├── packages/
│   └── shared/                  # tRPC routers, Zod schemas, Supabase types
├── supabase/
│   ├── migrations/              # SQL schema + RLS + cron + indexes
│   ├── functions/               # Deno Edge Functions
│   └── seed.sql                 # Seed data
└── .github/workflows/           # CI/CD pipelines
```

### 3.2 Layer-by-Layer

| Layer              | Technology                                             |
|--------------------|--------------------------------------------------------|
| Language           | TypeScript (all packages)                              |
| Web Frontend       | Next.js 14 App Router, TailwindCSS, React Query        |
| Mobile Frontend     | Expo, NativeWind (Tailwind for RN), React Hook Form    |
| API Layer          | tRPC v11, Next.js API route adapter                    |
| Edge Functions     | Deno (Supabase Edge Runtime)                           |
| Database           | Supabase PostgreSQL + Row-Level Security               |
| Auth               | Supabase Auth (email/password; OAuth-ready)            |
| Realtime           | Supabase Realtime (slots, bookings, notifications)     |
| Storage            | Supabase Storage (avatars, cover images)               |
| Payments           | Razorpay (checkout, order creation, signature verify)  |
| Caching / Locks    | Upstash Redis                                          |
| Email              | Resend                                                 |
| Push Notifications | Expo Push + MSG91                                      |
| Maps               | Google Maps SDK (mobile)                               |
| Scheduling         | pg_cron (automated reminder jobs)                      |
| Build / CI         | Turborepo, pnpm, ESLint, Prettier, Vitest, GitHub Actions |

---

## 4. Data Model

### 4.1 Entity-Relationship Summary

```
profiles ───┬── salons (owner_id)          ┌── barbers (profile_id)
            │                               │
            ├── barbers (profile_id)         │   ┌── services (barber_id)
            │                               │   │
            ├── bookings (customer_id)      │   └── slots (barber_id)
            │                               │
            ├── reviews (customer_id)          │
            │                               └── bookings (barber_id, slot_id unique)
            │
            ├── notifications (user_id)
            └── payouts (barber_id via profiles.barber_id)

slots ─────── booking (slot_id unique)
bookings ──── reviews (booking_id unique)
```

### 4.2 Table Definitions

#### `profiles`
| Column       | Type         | Notes                                      |
|--------------|--------------|--------------------------------------------|
| id           | UUID         | FK → auth.users (PK)                       |
| full_name    | TEXT         |                                            |
| phone        | TEXT         |                                            |
| avatar_url   | TEXT         |                                            |
| role         | role_t       | customer / barber / admin                   |
| is_banned    | BOOLEAN      | Default false                              |
| push_token   | TEXT         | Expo push token for mobile notifications    |

#### `salons`
| Column          | Type    | Notes                    |
|-----------------|---------|--------------------------|
| id              | UUID    | PK                       |
| owner_id        | UUID    | FK → profiles            |
| name            | TEXT    |                          |
| address         | TEXT    |                          |
| city            | TEXT    |                          |
| lat / lng       | FLOAT   | Geolocation              |
| cover_image_url | TEXT    |                          |
| rating          | NUMERIC | Avg of barbers' ratings  |
| is_active       | BOOLEAN | Admin toggle             |

#### `barbers`
| Column           | Type    | Notes                        |
|------------------|---------|------------------------------|
| id               | UUID    | PK                           |
| profile_id       | UUID    | FK → profiles (unique)       |
| salon_id         | UUID    | FK → salons                  |
| bio              | TEXT    |                              |
| experience_years | INT     |                              |
| avatar_url       | TEXT    |                              |
| cover_image_url  | TEXT    |                              |
| is_available     | BOOLEAN |                              |

#### `services`
| Column             | Type    | Notes                  |
|--------------------|---------|------------------------|
| id                 | UUID    | PK                     |
| barber_id          | UUID    | FK → barbers           |
| name               | TEXT    |                        |
| description        | TEXT    |                        |
| duration_minutes   | INT     |                        |
| price              | NUMERIC |                        |

#### `slots`
| Column     | Type         | Notes                                           |
|------------|--------------|-------------------------------------------------|
| id         | UUID         | PK                                              |
| barber_id  | UUID         | FK → barbers                                    |
| start_time | TIMESTAMPTZ  |                                                 |
| end_time   | TIMESTAMPTZ  |                                                 |
| status     | slot_status  | available / locked / booked / cancelled         |

#### `bookings`
| Column          | Type            | Notes                                |
|-----------------|-----------------|--------------------------------------|
| id              | UUID            | PK                                   |
| slot_id         | UUID            | FK → slots, UNIQUE                   |
| service_id      | UUID            | FK → services                        |
| customer_id     | UUID            | FK → profiles                        |
| barber_id       | UUID            | FK → barbers                        |
| status          | booking_status  | pending / confirmed / completed / cancelled |
| payment_id      | TEXT            | Razorpay payment ID                  |
| payment_status  | payment_status_t| pending / paid / failed / refunded  |
| total_amount    | NUMERIC         |                                      |
| notes           | TEXT            |                                      |
| created_at      | TIMESTAMPTZ     |                                      |

#### `reviews`
| Column       | Type    | Notes                  |
|--------------|---------|------------------------|
| id           | UUID    | PK                     |
| booking_id   | UUID    | FK → bookings, UNIQUE  |
| customer_id  | UUID    | FK → profiles          |
| barber_id    | UUID    | FK → barbers           |
| rating       | INT     | 1–5                    |
| comment      | TEXT    |                        |

#### `payouts`
| Column           | Type          | Notes                       |
|------------------|---------------|-----------------------------|
| id               | UUID          | PK                          |
| barber_id        | UUID          | FK → barbers                |
| period_start      | DATE          |                             |
| period_end       | DATE          |                             |
| gross_amount     | NUMERIC       |                             |
| commission_amount| NUMERIC       |                             |
| net_amount       | NUMERIC       |                             |
| status           | payout_status | pending / processing / paid |

#### `notifications`
| Column  | Type   | Notes           |
|---------|--------|-----------------|
| id      | UUID   | PK              |
| user_id | UUID   | FK → profiles   |
| type    | TEXT   |                 |
| title   | TEXT   |                 |
| body    | TEXT   |                 |
| data    | JSONB  |                 |
| read    | BOOLEAN | Default false   |

---

## 5. API Design

### 5.1 Transport

All client-to-server communication uses **tRPC v11** over HTTP, routed through a single Next.js API handler:

```
POST/GET https://<host>/api/trpc/<router>.<procedure>
Authorization: Bearer <supabase-jwt>
```

### 5.2 Procedure Types

| Procedure Type    | Auth Requirement                                   |
|-------------------|---------------------------------------------------|
| `publicProcedure` | None                                              |
| `protectedProcedure` | Valid Supabase session (any authenticated user) |
| `barberProcedure` | Authenticated + `profiles.role === 'barber'`       |

### 5.3 Router Inventory

#### `barberRouter`
| Procedure         | Type   | Description                              |
|-------------------|--------|------------------------------------------|
| `barber.getAll`   | public | List all barbers with salon info          |
| `barber.getById`  | public | Single barber detail + services           |
| `barber.getNearby`| public | Geolocation search (lat, lng, radiusKm)  |
| `barber.getSlots` | public | Available slots for a barber on a date   |

#### `bookingRouter`
| Procedure               | Type        | Description                    |
|-------------------------|-------------|--------------------------------|
| `booking.getMyBookings` | protected   | Customer's own bookings        |
| `booking.getBarberBookings` | barber  | Barber's bookings              |
| `booking.getById`       | protected   | Single booking detail          |
| `booking.cancel`        | protected   | Cancel with refund check        |
| `booking.markComplete`  | barber      | Barber marks booking complete   |

#### `vendorRouter` (Barber-facing)
| Procedure              | Type   | Description                        |
|------------------------|--------|------------------------------------|
| `vendor.getMyProfile`   | barber | Barber's own profile + salon       |
| `vendor.updateProfile`  | barber | Update bio, avatar, services        |
| `vendor.createSlots`    | barber | Generate slots from schedule template |
| `vendor.deleteSlot`     | barber | Remove a future available slot      |
| `vendor.getEarnings`   | barber | Earnings summary (today/week/month/all) |
| `vendor.getDailyEarnings` | barber | Per-day earnings for chart       |
| `vendor.deleteService`  | barber | Remove a service                   |
| `vendor.getPayouts`     | barber | Payout history                    |

#### `reviewRouter`
| Procedure         | Type        | Description                    |
|-------------------|-------------|--------------------------------|
| `review.create`   | protected   | Submit review for a completed booking |
| `review.getByBarber` | public   | All reviews for a barber       |

### 5.4 Edge Function API (Service-Role Only)

These operate outside tRPC and use the Supabase **service role key** (never exposed to clients):

| Function               | Trigger        | Purpose                                      |
|------------------------|----------------|----------------------------------------------|
| `book-slot`            | Client POST    | Atomic lock (Redis + Postgres) + Razorpay order |
| `confirm-booking`      | Razorpay webhook | Verify signature + insert booking + notify |
| `cancel-booking`       | Client POST    | Cancel + release slot + check refund          |
| `release-slot`         | Client POST    | Release locked slot on payment failure        |
| `generate-availability`| Client POST    | Create slots from weekly schedule template   |
| `send-reminders`       | pg_cron (daily) | Send push/email/SMS reminders               |

---

## 6. Feature Specifications

### 6.1 Customer App Features

| Feature               | Description                                                       |
|-----------------------|-------------------------------------------------------------------|
| Barber Discovery      | List all barbers, filter by location (geolocation), view profiles |
| Service Browsing      | View services per barber (name, description, duration, price)     |
| Slot Availability     | Real-time slot display per date via Supabase Realtime              |
| Booking Flow          | Date → Slot → Service → Biometric confirm → Payment               |
| Payment               | Razorpay checkout with server-side signature verification          |
| Notifications         | Push notifications (Expo) for booking confirm/cancel/reminders    |
| Booking History       | View all past/upcoming bookings, cancel eligible ones             |
| Deep Linking          | Push notifications deep-link to booking detail screen              |

### 6.2 Barber App Features

| Feature               | Description                                                       |
|-----------------------|-------------------------------------------------------------------|
| Dashboard             | Today's bookings, earnings, countdown to next appointment         |
| Calendar View         | Visual calendar of bookings                                       |
| Slot Management       | Create from weekly schedule template, delete future slots         |
| Profile Editing       | Bio, avatar, cover image, services, availability toggle            |
| Booking Details       | View customer details for each booking                            |
| Mark Complete         | Barber marks booking as completed to unlock review                |
| Earnings Tracking     | Today / week / month / all-time earnings + bar chart              |
| Payout History        | View past payout records                                         |

### 6.3 Admin Panel Features

| Feature               | Description                                                       |
|-----------------------|-------------------------------------------------------------------|
| Overview Dashboard    | Total bookings, revenue, active barbers, registered users          |
| Daily Bookings Chart  | 30-day line chart of daily bookings                               |
| Weekly Revenue Chart  | Weekly bar chart                                                  |
| Barbers Management    | List + detail view of all barbers                                 |
| Salons Management     | List + detail view, toggle active status                           |
| Users Management      | View all registered users                                         |
| Payouts Management    | View payout records                                               |
| Role-Gated Access     | Admin middleware enforces `role === 'admin'` on all routes        |

### 6.4 Backend / Platform Features

| Feature               | Description                                                       |
|-----------------------|-------------------------------------------------------------------|
| Atomic Slot Locking   | Redis distributed lock + atomic Postgres `UPDATE...WHERE`          |
| Payment Verification  | Server-side Razorpay signature check                               |
| Automatic Reminders   | pg_cron job triggers notification dispatch daily                  |
| Realtime Updates      | Supabase Realtime broadcasts slot/booking changes                 |
| Image Storage         | Supabase Storage for avatars and cover images                     |
| Rate Limiting         | Per-IP Redis rate limit on all edge functions                     |
| Biometric Auth        | Expo Local Authentication before payment commit                    |

---

## 7. Security Model

### 7.1 Authentication

- Supabase Auth handles email/password registration and login
- JWT sessions are forwarded via `Authorization: Bearer` header to tRPC
- Admin panel routes protected by Next.js middleware checking `profiles.role === 'admin'`
- Edge functions called only with server-side service role key

### 7.2 Authorization (RLS)

Row-Level Security is enforced at the PostgreSQL level on **all tables**:

| Table          | Key RLS Policies                                          |
|----------------|-----------------------------------------------------------|
| `profiles`     | Users read/update own row; admins read all                |
| `salons`      | Owners manage own; public read active                     |
| `barbers`     | Barber manages own; public read active + available         |
| `services`    | Barber manages own; public read                           |
| `slots`       | Public read available slots; barber manages own barber's   |
| `bookings`    | Customer sees own; barber sees own; admin sees all        |
| `reviews`     | Customer creates own once; public read per barber         |
| `payouts`     | Barber sees own; admin sees all                           |
| `notifications` | Users see own only                                      |

### 7.3 Slot Locking — Double-Layer Atomicity

```
Client → book-slot edge function
  1. Acquire Upstash Redis lock (SETNX, TTL 10 min)
  2. Call try_lock_slot() — SQL function (SECURITY DEFINER, service_role)
     UPDATE slots SET status = 'locked' WHERE id = $1 AND status = 'available'
     Returns: 0 = not locked, 1 = locked
  3. Create Razorpay order with locked slot_id as receipt
  4. Return order_id to client
  5. On payment success → confirm-booking updates slot to 'booked'
  6. On payment failure / timeout → release-slot reverts slot to 'available'
```

### 7.4 Payment Security

- Razorpay `razorpay_order_id` + `razorpay_payment_id` + `razorpay_signature` verified server-side in `confirm-booking`
- Signature computed using `RAZORPAY_SECRET` (never client-side or committed)
- Refund eligibility checked server-side before processing

### 7.5 Rate Limiting

All edge functions enforce per-client-IP rate limits via Upstash Redis:
- `book-slot`: 5 requests / minute
- `confirm-booking`: 10 requests / minute
- `cancel-booking`: 5 requests / minute

---

## 8. Infrastructure & DevOps

### 8.1 CI/CD Pipelines

| Workflow              | Trigger                            | Steps                                         |
|-----------------------|------------------------------------|-----------------------------------------------|
| `ci.yml`              | Push to main / PR                  | Type-check → Lint → Test                      |
| `deploy-web.yml`      | Push to main (web files change)   | Deploy to Vercel                              |
| `deploy-mobile.yml`   | Push to main (mobile files change) | Trigger EAS build (expo.dev, async)           |
| `deploy-functions.yml`| Push to main (functions change)   | `supabase functions deploy`                    |

### 8.2 Environment Variables

| Location               | Variables (examples)                                      |
|------------------------|----------------------------------------------------------|
| Root `.env`            | Read by local Edge Functions dev                         |
| `apps/web/.env.local`  | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `apps/mobile/.env`     | `EXPO_PUBLIC_SUPABASE_*`, `GOOGLE_MAPS_*`                |
| Supabase Secrets       | Edge function env vars (RAZORPAY_*, RESEND_*, UPSTASH_*) |

### 8.3 Database Migrations

10 migrations applied in order:

| #  | Name                        | Purpose                                     |
|----|-----------------------------|---------------------------------------------|
| 01 | `init`                      | Core schema (profiles–reviews)              |
| 02 | `rls`                       | RLS policies on all tables                   |
| 03 | `realtime`                  | Enable realtime on slots, bookings, notifications |
| 04 | `cron`                      | pg_cron jobs for reminder dispatch          |
| 05 | `slots_public_select`       | RLS exception for public slot availability  |
| 06 | `avatars_storage`           | Storage bucket for avatars                  |
| 07 | `barber_admin`              | Additional RLS for barber/admin flows       |
| 08 | `notifications`            | RLS for notifications table                 |
| 09 | `lock_slot_function`       | Atomic `try_lock_slot()` SQL function       |
| 10 | `performance_indexes`      | Indexes on hot query paths                  |

---

## 9. Non-Functional Requirements

### 9.1 Performance

- Slot availability queries use GIST index on lat/lng for geospatial search
- Bookings and slots tables have indexes on `(barber_id, start_time)` and `(status)` for fast lookups
- tRPC enables automatic TypeScript inference end-to-end with zero runtime overhead

### 9.2 Availability

- Supabase handles replication and failover for PostgreSQL
- Edge Functions run on Deno Deploy global edge network
- Redis locks have TTL (10 min) to prevent deadlocks from abandoned payments

### 9.3 Scalability

- Stateless tRPC handlers scale horizontally behind Next.js
- Supabase Realtime scales WebSocket connections automatically
- pg_cron jobs run server-side; no client involvement required

### 9.4 Observability

- Console logging in Edge Functions for debugging
- CI pipelines enforce type-check, lint, and tests on every PR
- No third-party APM currently integrated (candidate for future: Axiom, Sentry)

---

## 10. Future Considerations

| Area               | Consideration                                                    |
|--------------------|------------------------------------------------------------------|
| OAuth              | Supabase Auth OAuth providers are configured but not yet wired UI |
| Multi-salon        | Barber currently belongs to one salon; multi-salon support if needed |
| Recurring bookings | Subscription-style booking for repeat customers                  |
| Reviews moderation | Admin panel currently has no review moderation feature           |
| Analytics export   | Admin charts are client-side only; server-exported analytics future |
| In-app messaging   | No chat/messaging between customer and barber currently           |
| Apple Pay / GPay   | Razorpay supports additional payment methods beyond card/wallet   |
| Web booking        | No public web-facing booking flow for non-admin users             |
| APM / Error tracking | Sentry or Axiom integration not yet deployed                   |

---

*This document is auto-generated from codebase analysis and reflects the current state of the Shravkash platform.*
