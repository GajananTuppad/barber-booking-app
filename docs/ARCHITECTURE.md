# Shravkash — Architecture Diagram

> This file contains Mermaid diagrams for the Shravkash barber booking platform.
> Render with any Mermaid-compatible viewer (GitHub, VS Code Mermaid extension, Mermaid Preview, etc.)

---

## 1. System Context (C4 Level 1)

```mermaid
graph TB
    %% External Actors
    Customer["👤 Customer<br/>(Mobile App)"]
    Barber["✂️ Barber<br/>(Mobile App)"]
    Admin["🛠️ Admin<br/>(Web Panel)"]

    %% System Boundary
    subgraph ShravkashPlatform["Shravkash Platform"]
        MobileApp["📱 Expo App<br/>(Customer + Barber)"]
        WebPanel["🖥️ Next.js Admin Panel<br/>(Admin)"]
        API["⚡ tRPC API<br/>(Next.js Route Handler)"]
        EdgeFns["🌐 Deno Edge Functions<br/>(Payment & Scheduling)"]
        Supabase["🐘 Supabase<br/>(Postgres + Auth + Realtime + Storage + pg_cron)"]
        Redis["🔴 Upstash Redis<br/>(Slot Locks + Rate Limiting)"]
    end

    %% External Services
    Razorpay["💳 Razorpay<br/>(Payments)"]
    Resend["📧 Resend<br/>(Transactional Email)"]
    ExpoPush["📲 Expo Push<br/>(Mobile Notifications)"]
    MSG91["📱 MSG91<br/>(WhatsApp / SMS)"]
    GoogleMaps["🗺️ Google Maps SDK<br/>(Geolocation)"]

    %% Actor → App connections
    Customer --> MobileApp
    Barber --> MobileApp
    Admin --> WebPanel

    %% Client → API connections
    MobileApp --> API
    WebPanel --> API

    %% API → Backend services
    API --> EdgeFns
    API --> Supabase
    EdgeFns --> Supabase
    EdgeFns --> Redis
    EdgeFns --> Razorpay
    Supabase --> Razorpay
    Supabase --> Resend
    Supabase --> ExpoPush
    Supabase --> MSG91
    MobileApp --> GoogleMaps
    MobileApp --> ExpoPush
```

---

## 2. Container Architecture (C4 Level 2)

```mermaid
graph LR
    subgraph Clients["Client Applications"]
        CustomerApp["📱 Customer App<br/>Expo + NativeWind<br/>Role: (customer)"]
        BarberApp["📱 Barber App<br/>Expo + NativeWind<br/>Role: (barber)"]
        AdminWeb["🖥️ Admin Web<br/>Next.js 14<br/>Role: (admin)"]
    end

    subgraph APILayer["API Layer"]
        tRPCHandler["tRPC Handler<br/>/api/trpc/[trpc]<br/>Bearer JWT Auth"]
        TRPCRouter["tRPC Router<br/>barberRouter<br/>bookingRouter<br/>vendorRouter<br/>reviewRouter"]
    end

    subgraph EdgeLayer["Edge Functions (Deno)"]
        bookSlot["book-slot<br/>Redis lock +<br/>Razorpay order"]
        confirmBooking["confirm-booking<br/>Signature verify +<br/>Insert booking"]
        cancelBooking["cancel-booking<br/>Cancel +<br/>Refund check"]
        releaseSlot["release-slot<br/>Revert locked slot"]
        generateSlots["generate-availability<br/>Weekly schedule →<br/>Slot rows"]
        sendReminders["send-reminders<br/>pg_cron triggered<br/>Push + Email + SMS"]
    end

    subgraph DataLayer["Data Layer"]
        Postgres["PostgreSQL<br/>Supabase<br/>+ RLS Policies"]
        Redis["Upstash Redis<br/>Slot Locks<br/>Rate Limits"]
        Storage["Supabase Storage<br/>Avatars<br/>Cover Images"]
    end

    subgraph ExternalServices["External Services"]
        Razorpay["Razorpay<br/>Checkout API<br/>Webhook"]
        Resend["Resend<br/>Transactional Email"]
        ExpoPush["Expo Push<br/>Notifications"]
        MSG91["MSG91<br/>WhatsApp / SMS"]
        GoogleMaps["Google Maps<br/>Geocoding + Places"]
    end

    %% Client → tRPC
    CustomerApp --> tRPCHandler
    BarberApp --> tRPCHandler
    AdminWeb --> tRPCHandler
    tRPCHandler --> TRPCRouter

    %% tRPC → Supabase
    TRPCRouter --> Postgres

    %% tRPC → Edge
    TRPCRouter --> bookSlot
    TRPCRouter --> confirmBooking
    TRPCRouter --> cancelBooking
    TRPCRouter --> generateSlots

    %% Edge → Data
    bookSlot --> Redis
    bookSlot --> Postgres
    confirmBooking --> Postgres
    confirmBooking --> Razorpay
    cancelBooking --> Postgres
    generateSlots --> Postgres
    sendReminders --> Postgres
    sendReminders --> ExpoPush
    sendReminders --> Resend
    sendReminders --> MSG91

    %% Edge → External
    bookSlot --> Razorpay
    confirmBooking --> Razorpay
    Postgres --> Storage
```

---

## 3. Booking Flow (Sequence Diagram)

```mermaid
sequenceDiagram
    participant Customer as 📱 Customer App
    participant tRPC as tRPC API
    participant Edge as book-slot (Edge Fn)
    participant Redis as Upstash Redis
    participant PG as Supabase Postgres
    participant Razor as Razorpay
    participant Confirm as confirm-booking (Edge Fn)

    Note over Customer: User selects date + slot + service

    Customer->>tRPC: barber.getSlots(barberId, date)
    tRPC->>PG: SELECT slots WHERE status='available'
    PG-->>tRPC: Available slots
    tRPC-->>Customer: Slot list

    Customer->>tRPC: vendor.createSlots (barber flow)
    Note over Customer: Or: barber has already created slots

    Customer->>tRPC: Trigger booking flow
    tRPC->>Edge: POST /functions/v1/book-slot
    Edge->>Redis: SETNX lock:slot:{id} (TTL 10min)
    Redis-->>Edge: Lock acquired?
    Edge->>PG: try_lock_slot(id) — UPDATE WHERE status='available'
    PG-->>Edge: 1 row updated (locked)
    Edge->>Razor: Create Razorpay order
    Razor-->>Edge: order_id
    Edge-->>tRPC: { orderId, slotId }
    tRPC-->>Customer: Razorpay checkout token

    Customer->>Razor: Complete payment in Razorpay UI
    Razor-->>Customer: payment_id + signature

    Customer->>tRPC: POST confirm-booking with signature
    tRPC->>Confirm: POST /functions/v1/confirm-booking
    Confirm->>Razor: Verify razorpay_signature
    Razor-->>Confirm: Valid!
    Confirm->>PG: INSERT booking + UPDATE slot to 'booked'
    PG-->>Confirm: Booking created
    Confirm->>Redis: DEL lock:slot:{id}
    Confirm->>PG: INSERT notification (customer + barber)
    PG-->>Confirm: Notification created
    Confirm-->>tRPC: { booking }
    tRPC-->>Customer: ✅ Booking confirmed!

    Note over Customer: pg_cron runs daily → send-reminders → push/email/SMS
```

---

## 4. Data Model (ER Diagram)

```mermaid
erDiagram
    PROFILES {
        uuid id PK
        text full_name
        text phone
        text avatar_url
        role_t role
        boolean is_banned
        text push_token
    }

    SALONS {
        uuid id PK
        uuid owner_id FK
        text name
        text address
        text city
        float lat
        float lng
        text cover_image_url
        numeric rating
        boolean is_active
    }

    BARBERS {
        uuid id PK
        uuid profile_id FK UK
        uuid salon_id FK
        text bio
        int experience_years
        text avatar_url
        text cover_image_url
        boolean is_available
    }

    SERVICES {
        uuid id PK
        uuid barber_id FK
        text name
        text description
        int duration_minutes
        numeric price
    }

    SLOTS {
        uuid id PK
        uuid barber_id FK
        timestamptz start_time
        timestamptz end_time
        slot_status status
    }

    BOOKINGS {
        uuid id PK
        uuid slot_id FK UK
        uuid service_id FK
        uuid customer_id FK
        uuid barber_id FK
        booking_status status
        text payment_id
        payment_status_t payment_status
        numeric total_amount
        text notes
        timestamptz created_at
    }

    REVIEWS {
        uuid id PK
        uuid booking_id FK UK
        uuid customer_id FK
        uuid barber_id FK
        int rating
        text comment
    }

    PAYOUTS {
        uuid id PK
        uuid barber_id FK
        date period_start
        date period_end
        numeric gross_amount
        numeric commission_amount
        numeric net_amount
        payout_status status
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        text type
        text title
        text body
        jsonb data
        boolean read
    }

    PROFILES ||--o{ SALONS : "owns"
    PROFILES ||--o| BARBERS : "is"
    SALONS ||--o{ BARBERS : "contains"
    BARBERS ||--o{ SERVICES : "offers"
    BARBERS ||--o{ SLOTS : "has"
    BARBERS ||--o{ BOOKINGS : "receives"
    BARBERS ||--o{ REVIEWS : "receives"
    BARBERS ||--o{ PAYOUTS : "receives"
    PROFILES ||--o{ BOOKINGS : "makes"
    PROFILES ||--o{ REVIEWS : "writes"
    PROFILES ||--o{ NOTIFICATIONS : "receives"
    SLOTS ||--o| BOOKINGS : "occupied by"
    BOOKINGS ||--o| REVIEWS : "generates"
    SERVICES ||--o| BOOKINGS : "selected in"
```

---

## 5. Slot Locking — State Machine

```mermaid
stateDiagram-v2
    [*] --> available : slot created
    available --> locked : book-slot (atomic UPDATE)
    locked --> booked : confirm-booking (payment success)
    locked --> available : release-slot (payment failed / timeout)
    locked --> available : TTL expires (10 min)
    booked --> cancelled : cancel-booking (refund eligible)
    booked --> completed : barber.markComplete
    completed --> [*]
    cancelled --> [*]
```

---

## 6. Directory Structure

```mermaid
graph TD
    root["barber-booking-app/"]
    
    root --> apps["apps/"]
    root --> packages["packages/"]
    root --> supabase["supabase/"]
    root --> github[".github/workflows/"]
    
    apps --> web["apps/web/"]
    apps --> mobile["apps/mobile/"]
    
    web --> webApp["app/"]
    webApp --> webPages["(admin)/<br/>(auth)/<br/>api/"]
    web --> webComponents["components/"]
    web --> webLib["lib/"]
    
    mobile --> mobileApp["app/"]
    mobileApp --> mobileRoutes["(auth)/<br/>(customer)/<br/>(barber)/"]
    mobile --> mobileHooks["hooks/"]
    mobile --> mobileProviders["providers/"]
    
    packages --> shared["packages/shared/"]
    shared --> sharedRouter["src/router/"]
    shared --> sharedLib["src/lib/"]
    shared --> sharedSchemas["src/schemas/"]
    shared --> sharedTypes["src/types/"]
    
    supabase --> migrations["migrations/"]
    supabase --> functions["functions/"]
    functions --> sharedEdge["_shared/"]
    functions --> bookSlot["book-slot/"]
    functions --> confirmBooking["confirm-booking/"]
    functions --> cancelBooking["cancel-booking/"]
    functions --> releaseSlot["release-slot/"]
    functions --> generateSlots["generate-availability/"]
    functions --> sendReminders["send-reminders/"]
    
    webComponents --> components["components/"]
    components --> dt["DataTable.tsx<br/>StatCard.tsx<br/>StatusBadge.tsx<br/>Skeleton.tsx<br/>ConfirmDialog.tsx"]
```

---

*Render this file with a Mermaid-compatible viewer for all diagrams.*
