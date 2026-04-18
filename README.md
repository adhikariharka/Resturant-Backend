# Harke — Restaurant Backend

REST + WebSocket API that powers **The British Kitchen**, a full-stack restaurant ordering and kitchen-management platform. Built with NestJS 11, PostgreSQL + Drizzle ORM, JWT auth, Stripe, Socket.io, Cloudinary, and Nodemailer.

The companion app lives at [`../Resturant-frontend`](../Resturant-frontend).

---

## Contents

1. [Overview](#overview)
2. [Tech stack](#tech-stack)
3. [Features](#features)
4. [Prerequisites](#prerequisites)
5. [Quick start](#quick-start)
6. [Environment variables](#environment-variables)
7. [Commands reference](#commands-reference)
8. [Seed data & test credentials](#seed-data--test-credentials)
9. [Image backup workflow](#image-backup-workflow)
10. [API reference](#api-reference)
11. [WebSocket events](#websocket-events)
12. [Database schema](#database-schema)
13. [Auth & authorization](#auth--authorization)
14. [Stripe webhook](#stripe-webhook)
15. [Docker](#docker)
16. [Project structure](#project-structure)

---

## Overview

The backend exposes three cooperating surfaces:

- **Customer API** — menu browsing, cart, checkout, orders, profile, reviews.
- **Admin API** — menu/category/hours/holidays/contact/settings management, dashboard analytics, staff management.
- **Staff API + WebSocket** — kitchen console for cooking/delivery workflow with real-time updates.

Payments go through Stripe Checkout. Images are uploaded to Cloudinary. Password-reset emails go out via Nodemailer (Gmail-compatible). Real-time kitchen updates are broadcast via Socket.io.

Swagger docs are served at `http://localhost:8000/api` when the backend is running.

---

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 20 / 22 |
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| Database | PostgreSQL |
| ORM | Drizzle ORM + `pg` |
| Auth | JWT (access + refresh) · bcrypt · Google OAuth |
| Realtime | Socket.io (`@nestjs/platform-socket.io`) |
| Payments | Stripe (Checkout + Webhooks) |
| Uploads | Cloudinary (`multer-storage-cloudinary`) |
| Email | Nodemailer (Gmail via app password) |
| Docs | Swagger (`@nestjs/swagger`) |
| Tests | Jest + Supertest |

---

## Features

### Authentication & users
- Email + password registration and login
- Google OAuth sign-in / sign-up (auto-creates the user)
- JWT access tokens (15 min) with refresh tokens (7 d) stored hashed
- Refresh-token rotation and per-session logout
- "Active sessions" endpoint to see / revoke devices
- Password reset via emailed token (1-hour expiry)
- `whoami` endpoint

### Catalog
- Categories with description, display order, active flag, image
- Food items with discount price, tags, allergens, spicy level, prep time, calories, stock
- Food options (sizes / spice levels / extras / doneness) — required & multi-select supported
- Image uploads through Cloudinary (admin / staff only)

### Cart
- Per-user server-side cart (one row per `(user, item)` enforced by a unique index)
- Add / update quantity / remove / clear
- Automatically cleared on successful payment

### Orders
- Lifecycle: `pending_payment → placed → confirmed → cooking → on_the_way → delivered | cancelled`
- Separate `paymentStatus` (`pending | paid | failed | refunded`)
- Delivery fee auto-zeroes over the configurable free-delivery threshold
- Item snapshots (`itemName`, `itemImage`) preserved when the menu changes
- Stripe Checkout session for card orders; cash orders skip payment
- `retry-payment` endpoint for failed / expired card orders
- Ownership enforcement: users can only see their own orders (admin/staff override)
- Auto-cancel pending-payment orders older than 5 minutes

### Staff / kitchen console
- Separate `staff` table keyed by email
- Roles: `staff` or `admin`; permission tags: `kitchen`, `delivery`, `temporary_status`
- Action log (`staff_logs`) records every status transition with the actor
- Real-time `new_order` + `order_updated` events over Socket.io
- Temporary restaurant closure toggle

### Admin
- Dashboard with revenue, order counts, popular items
- Opening hours (per-weekday, timezone-aware) + holidays (YYYY-MM-DD)
- Restaurant settings: tax rate, service charge, delivery fee, free-delivery threshold, min-order, currency
- Contact info with socials, logo, tagline
- Staff account creation (admin only)

### Reviews
- 1-5 star review with optional comment, linked to a delivered order
- Admin listing (with user data) and admin response field

### Real-time
- Staff room via `join_staff_room`
- `new_order` broadcast when an order transitions into `confirmed` (card paid) or on cash order creation
- `order_updated` broadcast on every status change

### Storage safety
- `npm run db:backup-images` dumps all current category/food image URLs to a JSON checkpoint
- The seed reads that JSON and overrides defaults, so re-seeding preserves your Cloudinary uploads

---

## Prerequisites

- Node.js 20 or 22 (matches the Docker image)
- PostgreSQL 14+ (a managed or local instance is fine)
- A Stripe test account (for card payments)
- A Cloudinary account (for image uploads)
- A Google Cloud project with an OAuth 2.0 client (for Google sign-in)
- A Gmail account with an app password (for password-reset emails)

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# edit .env and fill in DATABASE_URL, JWT secrets, Stripe, Cloudinary, mailer, Google client ID

# 3. Push the schema to Postgres
npm run db:push

# 4. Seed the database (idempotent for users/staff, full refresh for menu/orders)
npm run db:seed

# 5. Run the server in watch mode
npm run start:dev
```

Once running:
- REST API: <http://localhost:8000>
- Swagger: <http://localhost:8000/api>
- WebSocket: `ws://localhost:8000`

---

## Environment variables

Copy from `.env.example`:

```env
# Server
PORT=8000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/resturant

# JWT
JWT_SECRET=change-me-to-a-long-random-string
JWT_REFRESH_SECRET=change-me-to-another-long-random-string

# Google OAuth (must match the frontend's NEXT_PUBLIC_GOOGLE_CLIENT_ID)
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Mailer (Gmail app password works best)
MAIL_USER=your-mail@gmail.com
MAIL_PASS=your-app-password
```

---

## Commands reference

### Runtime

| Command | What it does |
|---|---|
| `npm run start:dev` | Hot-reload dev server |
| `npm run start:debug` | Dev server with Node inspector |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start:prod` | Run the compiled build |
| `npm run format` | Prettier on `src/` + `test/` |
| `npm run lint` | ESLint with auto-fix |

### Database (Drizzle)

| Command | What it does |
|---|---|
| `npm run db:generate` | Generate a new migration from schema changes |
| `npm run db:push` | Push the schema directly (dev only — skips migration files) |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Drizzle Studio web UI |
| `npm run db:seed` | Wipe menu/orders/reviews, recreate sample data, upsert staff + users |
| `npm run db:backup-images` | Snapshot current category/food image URLs to `src/scripts/data/image-backup.json` |

### Tests

| Command | What it does |
|---|---|
| `npm run test` | Unit tests |
| `npm run test:watch` | Watch mode |
| `npm run test:cov` | Coverage report |
| `npm run test:e2e` | End-to-end tests |

---

## Seed data & test credentials

Running `npm run db:seed` will:

- Seed realistic **opening hours** (Mon–Thu 11:30–22:00, Fri/Sat later, 10:00 brunch on weekends)
- Seed 4 **holidays** (Christmas Day, Boxing Day, New Year's Day, May Bank Holiday — year-aware)
- Seed **restaurant settings**: 20 % VAT, 10 % service, £3.50 delivery, £40 free-delivery threshold, £10 min order, GBP
- Seed **contact info** with socials
- Upsert 5 **staff accounts** (see below)
- Upsert 1 admin + 6 **customer accounts** with addresses
- Wipe and recreate **10 categories**, **40+ food items**, and **food options** (size / spice / doneness / extras)
- Create ~10 **sample orders** across statuses, ages, and payment methods
- Create a few **reviews** for recent delivered orders
- Pre-fill a **sample cart** for the test customer

### Test credentials

**Customer side (NextAuth credentials provider on `/login`):**

| Role | Email | Password |
|---|---|---|
| Admin | `admin@thebritishkitchen.co.uk` | `admin123` |
| Customer | `james@example.com` | `password123` |
| Customer | `emily@example.com` | `password123` |
| Customer | `oliver@example.com` | `password123` |
| Customer | `sophie@example.com` | `password123` |
| Customer | `rajesh@example.com` | `password123` |
| Customer | `mia@example.com` | `password123` |

**Staff console (also signs in via `/login`):**

| Role | Email | Password | Permissions |
|---|---|---|---|
| Head Chef | `kitchen@thebritishkitchen.co.uk` | `kitchen123` | `kitchen` |
| Sous Chef | `priya@thebritishkitchen.co.uk` | `kitchen123` | `kitchen` |
| Rider | `marcus@thebritishkitchen.co.uk` | `delivery123` | `delivery` |
| Rider | `sofia@thebritishkitchen.co.uk` | `delivery123` | `delivery` |
| Floor Manager (admin) | `manager@thebritishkitchen.co.uk` | `manager123` | `kitchen`, `delivery`, `admin` |

---

## Image backup workflow

The menu seed wipes `food_items` and `categories` on every run. If images have been reuploaded through the admin UI, they would be lost — so the seed reads from a local JSON checkpoint first:

```bash
# Whenever you upload new images through the admin UI, capture them:
npm run db:backup-images

# This writes src/scripts/data/image-backup.json keyed by slug.
# On the next `npm run db:seed`, those URLs override the hardcoded defaults.
```

The checkpoint is committed to the repo so every developer re-seeds to the same images.

---

## API reference

All responses are JSON. Auth uses the header `Authorization: Bearer <jwt>`.

### Public endpoints (no auth required)

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check (returns "Hello World!") |
| `POST` | `/auth/login` | Email + password login |
| `POST` | `/auth/register` | Register a customer |
| `POST` | `/auth/google` | Exchange a Google token for our JWTs |
| `POST` | `/auth/refresh` | Rotate refresh token |
| `POST` | `/auth/forgot-password` | Request reset email |
| `POST` | `/auth/reset-password` | Complete reset with token |
| `GET` | `/hours` | Weekly opening hours |
| `GET` | `/hours/status` | Is the restaurant open right now? |
| `GET` | `/hours/next-open` | Next opening window |
| `GET` | `/categories` | Menu categories |
| `GET` | `/categories/:id` | A single category |
| `GET` | `/food` | All food items |
| `GET` | `/food/:id` | One item by id |
| `GET` | `/food/by-slug/:slug` | One item by slug |
| `GET` | `/contact-info` | Contact info for the footer |
| `GET` | `/settings` | Temporary-closed status |
| `POST` | `/orders/webhook` | Stripe webhook target (signature-verified) |
| `POST` | `/staff/auth/login` | Staff sign-in |

### Authenticated — any logged-in user

| Method | Path | Notes |
|---|---|---|
| `GET` | `/auth/whoami` | Current user |
| `GET` | `/auth/sessions` | Active refresh tokens |
| `POST` | `/auth/logout` | Log out current or specific device |
| `POST` | `/auth/logout-all` | Log out everywhere |
| `PATCH` | `/users/:id` | Update own profile (admin can update anyone) |
| `GET` | `/cart` | Current user's cart |
| `POST` | `/cart` | Add an item |
| `PATCH` | `/cart/:id` | Update quantity |
| `DELETE` | `/cart/:id` | Remove item |
| `DELETE` | `/cart` | Clear cart |
| `POST` | `/addresses` | Create (userId taken from token) |
| `GET` | `/addresses/user/:userId` | Self or admin |
| `PATCH` | `/addresses/:id` | Must own the address |
| `DELETE` | `/addresses/:id` | Must own the address |
| `POST` | `/orders` | Create an order (userId taken from token) |
| `GET` | `/orders` | My orders |
| `GET` | `/orders/:id` | Owner or staff / admin |
| `POST` | `/orders/verify-payment` | Verify Stripe session |
| `POST` | `/orders/:id/retry-payment` | Retry a failed card order |
| `POST` | `/reviews` | Leave a review (userId from token) |

### Admin / staff

| Method | Path | Role(s) |
|---|---|---|
| `GET` | `/orders/all` | admin, staff |
| `GET` | `/orders/:id/logs` | admin |
| `GET` | `/dashboard/stats` | admin, staff |
| `GET` | `/dashboard/recent-orders` | admin, staff |
| `POST` | `/categories` | admin, staff |
| `PUT` | `/categories/:id` | admin, staff |
| `DELETE` | `/categories/:id` | admin, staff |
| `POST` | `/food` | admin, staff |
| `PUT` | `/food/:id` | admin, staff |
| `DELETE` | `/food/:id` | admin, staff |
| `PATCH` | `/food/:id/stock` | staff (kitchen), admin |
| `PATCH` | `/hours/:id` | admin, staff |
| `POST` | `/upload` | admin, staff |
| `PATCH` | `/settings/status` | staff with `temporary_status`, admin |
| `GET` | `/admin/settings` | admin |
| `PATCH` | `/admin/settings` | admin |
| `GET` | `/admin/holidays` | admin |
| `POST` | `/admin/holidays` | admin |
| `PATCH` | `/admin/holidays/:date` | admin |
| `DELETE` | `/admin/holidays/:date` | admin |
| `GET` | `/admin/contact-info` | admin |
| `PATCH` | `/admin/contact-info` | admin |
| `GET` | `/staff` | admin |
| `POST` | `/staff` | admin |
| `GET` | `/reviews` | admin |

### Kitchen-scoped (staff token)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/staff/orders` | Active orders list |
| `PATCH` | `/staff/orders/:id/status` | Transition an order's status |

Permission matrix for the status transition:

| Permission | Allowed target statuses |
|---|---|
| `kitchen` | `confirmed`, `cooking`, `on_the_way` |
| `delivery` | `delivered` |
| `admin` (role) | any |

Every status change is recorded in `staff_logs`.

---

## WebSocket events

Connect to the same host as the API (`http://localhost:8000`). Staff clients emit `join_staff_room` once after connecting.

| Event | Direction | Payload |
|---|---|---|
| `join_staff_room` | client → server | n/a |
| `joined_staff_room` | server → client | `"success"` |
| `new_order` | server → staff room | Full order object |
| `order_updated` | server → all | `{ orderId, status, order }` |

---

## Database schema

All tables use UUID primary keys and `created_at` / `updated_at` timestamps where it makes sense. Key tables:

- **users** — email / password / name / phone / avatar / role (`customer` | `admin` | `staff`) / `isActive` / `emailVerified` / reset-token
- **refresh_tokens** — cascaded with user, hashed
- **addresses** — user addresses with country / phone / instructions / default flag
- **categories** — name, slug, description, image, `displayOrder`, `isActive`
- **food_items** — name, slug, description, price, optional discount, image, category, popular flag, stock, prep time, calories, spicy level, allergens, tags, timestamps
- **food_options** — `isRequired`, `allowMultiple`, `displayOrder`, typed `choices` (id/name/priceModifier)
- **orders** — order number, user, status enum, `paymentStatus` enum, subtotal / tax / service / delivery / discount / total, delivery address snapshot, payment method, `stripeSessionId`, notes, timestamps
- **order_items** — snapshot fields (`itemName`, `itemImage`), quantity, selected options, `priceAtOrder`
- **reviews** — rating, comment, `adminResponse`, approval flag; unique per order
- **opening_hours** — per-weekday (text + `day_order`), open/close time, closed flag, timezone
- **holidays** — ISO date, name, message
- **restaurant_settings** — tax rate, service charge, delivery fee, free-delivery threshold, min order, currency, temporary-closed flag
- **contact_info** — restaurant name, tagline, description, logo, email, phone, address, social URLs
- **cart_items** — user + item, quantity; unique `(userId, foodItemId)`
- **staff** — email (unique), password, name, phone, role, `permissions[]`, `isActive`
- **staff_logs** — audit trail for every order-status change

Indexes cover the foreign keys and the frequently-queried columns (order status, order created-at, review approval, etc.).

---

## Auth & authorization

**Token shape** (both customer and staff flows issue the same structure, same secret):

```json
{
  "sub": "<user or staff id>",
  "email": "...",
  "role": "customer | admin | staff",
  "permissions": [ "kitchen", "delivery", "..." ]   // staff only
}
```

**Guards:**

- `JwtAuthGuard` — attaches `req.user`. Honours `@Public()` to skip.
- `RolesGuard` — reads `@Roles('admin', 'staff')` and matches against `req.user.role`.
- `StaffAuthGuard` — narrower version that only accepts tokens whose `role` is `staff` or `admin`. Used on the `/staff/...` controllers.

**Ownership checks** live in the controllers where natural (orders, addresses, user profile).

---

## Stripe webhook

The webhook endpoint is:

```
POST /orders/webhook
```

Events to subscribe to:

- `checkout.session.completed` — marks the order `confirmed` + `paid`, clears cart, emits `new_order`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

When developing with a hosted backend (e.g. `https://harke.prajwolghimire.com.np`), point Stripe's webhook endpoint to `https://<your-domain>/orders/webhook`.

The raw request body is preserved (`{ rawBody: true }` in `main.ts`) so signature verification works — make sure any reverse proxy / body rewriter in front of Nest leaves the POST body alone.

---

## Docker

A multi-stage `Dockerfile` (Node 22 Alpine) is included. Run either standalone:

```bash
docker build -t harke-backend .
docker run --env-file .env -p 8001:8001 harke-backend
```

or via Compose (pulls `DATABASE_URL` from your external Postgres):

```bash
docker compose up --build
```

The container listens on port **8001**.

---

## Project structure

```
src/
├── admin/              # holidays, hours, contact-info, settings
├── auth/               # login / register / google / refresh / reset-password
│   ├── dto/
│   ├── jwt.strategy.ts
│   ├── jwt-auth.guard.ts
│   ├── roles.guard.ts
│   ├── staff-auth.guard.ts
│   └── public.decorator.ts
├── cart/
├── catalog/            # categories + food
├── dashboard/          # analytics
├── drizzle/
│   ├── drizzle.module.ts
│   ├── schema.ts       # single source of truth for the database
│   └── types.ts
├── orders/
│   ├── controllers/staff-orders.controller.ts
│   ├── dto/
│   ├── gateway/orders.gateway.ts   # Socket.io
│   ├── orders.controller.ts        # customer surface
│   ├── orders.service.ts
│   └── orders.module.ts
├── payments/           # Stripe wrapper
├── reviews/
├── scripts/
│   ├── seed.ts                     # npm run db:seed
│   ├── backup-images.ts            # npm run db:backup-images
│   └── data/image-backup.json      # checkpoint read by the seed
├── settings/           # public + staff-scoped settings
├── staff/              # staff CRUD + login
├── upload/             # Cloudinary
├── users/              # customer profile + addresses
└── main.ts             # bootstraps Nest with rawBody + Swagger
```

---

## License

Private project for educational use. No license granted.
