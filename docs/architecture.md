# Architecture

**Product:** LocalServe  
**Status:** Draft for MVP  
**Based on:** [PRD.md](./PRD.md)

A Vite React SPA on Vercel, with Supabase as the backend (Auth, Postgres, Storage). No separate Nest/Express API for MVP. Marketplace **rules** live in the database (RLS + Postgres functions), not only in the browser.

## 1. High-level shape

```text
Browser (React + Vite + Tailwind)
        │  HTTPS
        ▼
Vercel  (static SPA + SPA fallback to index.html)
        │  anon key + user JWT
        ▼
Supabase
  ├ Auth          email/password, session
  ├ Postgres      cities, categories, profiles, listings, bookings, reviews, notifications
  ├ RLS           who can read/write which rows
  ├ RPC           booking transitions, review insert, rating rollup
  ├ Storage       listing cover images
  └ (later) Edge Functions + Resend for email
```

The app is still “one web app + one database.” Supabase _is_ that database and the auth/API layer.

## 2. Why this split matches the PRD

| PRD need                                     | Where it lives                                                                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Guests browse by locality in Samundri        | Public `SELECT` on active listings filtered by `area_id` and `city_id = Samundri` (RLS)                                 |
| Sign in to book/review                       | Supabase Auth + `profiles`                                                                                              |
| Dual role, not self-book                     | `user_roles` + RPC checks                                                                                               |
| Booking state machine                        | **One** Postgres function per action (`accept`, `decline`, `cancel`, `complete`) — client cannot `UPDATE status` freely |
| Address only for parties                     | RLS on `bookings`: no address for strangers                                                                             |
| Reviews only after complete, one per booking | Unique on `booking_id` + RPC that checks `completed`                                                                    |
| Admin moderate                               | `admin` role; RPC or tight RLS                                                                                          |
| Cover photos                                 | Storage bucket; public URLs for active listings                                                                         |

If the client is allowed to patch `bookings.status` directly, the PRD rules will be bypassed. **Treat booking writes as RPCs, not table updates from the UI.**

## 3. Frontend

**Chosen:** React, Vite, Tailwind, deploy on Vercel.

**Also required:**

| Piece                      | Role                                                                   |
| -------------------------- | ---------------------------------------------------------------------- |
| **TypeScript**             | Shared types with generated Supabase types                             |
| **React Router**           | Public search, listing, auth, customer bookings, provider inbox, admin |
| **TanStack Query**         | Listings, inboxes, cache after accept/complete                         |
| **react-hook-form + Zod**  | Register, listing, booking, review                                     |
| **date-fns** (or Temporal) | Display local time; store UTC in Postgres                              |
| **@supabase/supabase-js**  | Client SDK                                                             |
| **lucide-react**           | Icons; status is still a **text label** (not color-only)               |
| **supabase gen types**     | `database.ts` from the project schema                                  |

**App areas (routes, not micro-frontends):**

- Public: home, Samundri-area search, listing detail
- Auth: login, register (role: customer or provider)
- Customer: my bookings, review
- Provider: my listings, incoming requests
- Admin: areas, categories, hide review, deactivate listing/user

Vite env only: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. **Never** put the **service role** key in the frontend or Vercel public env.

**Vercel:** build `vite build`, output `dist`, rewrite all paths to `index.html` so `/listings/:id` works on refresh. Connect the Git repo for preview deploys.

## 4. Backend (Supabase)

### Auth

- Email + password for MVP.
- Trigger on `auth.users` insert → create `profiles` row (display name, fixed city `Samundri`, selected area, phone later).
- Roles in `user_roles` (`customer` | `provider` | `admin`), not only Auth user metadata (metadata is easy to spoof from the client unless locked down).
- **Admin is not self-serve.** Seed one admin in the dashboard; signup only allows customer/provider.
- Password reset emails: enable in Supabase Auth (configure SMTP before go-live).

### Postgres (logical model)

Tables aligned with the PRD: `cities`, `areas`, `categories`, `profiles`, `user_roles`, `listings`, `bookings`, `reviews`, `notifications`.

- Launch city is fixed to **Samundri** in Faisalabad District. Area selection is a fixed dropdown of approved Samundri localities within about 5–10 km; no free-text neighborhood fields or distant towns.
- `profiles.area_id` and `listings.area_id` are required and refer to the fixed `areas` catalog. `city_id` remains fixed to Samundri for the launch city.
- Money: `numeric` + `currency` (`PKR` default via config).
- Time: `timestamptz` UTC.
- Snapshot listing title/price onto `bookings` so later price edits do not rewrite history.
- Check `customer_id <> provider_id`.
- Listing `rating_avg` / `rating_count` updated in the same transaction as a review (trigger or RPC).

### RLS (authorization layer)

- Listings: anyone reads `is_active`; owner reads inactive; owner insert/update own rows.
- Bookings: select only if customer, provider, or admin; **address column** only those same people.
- Reviews: public select where `not is_hidden`; insert only via RPC.
- Cities/categories: public read active; write admin only.

### RPC (state machine)

Functions: `create_booking`, `accept_booking`, `decline_booking`, `cancel_booking`, `complete_booking`, `submit_review`.

Each: `auth.uid()`, legal transition, write notification row. Illegal → raise exception (maps to an error in the client).

### Search

- Filter `area_id` required for the active Samundri locality. The city remains fixed to Samundri for the MVP.
- `ilike` on title/description for MVP; add `tsvector` if it gets slow.
- Indexes: `(city_id, area_id, is_active, category_id)`, provider inbox `(provider_id, status, created_at desc)`.

### Storage

- Bucket `listing-covers`: authenticated upload to `providerId/...`; public read.
- Allow jpeg/png/webp, size cap; no SVG.

### Realtime (optional, not required for MVP)

- Provider inbox can poll with TanStack Query.
- Later: `notifications` realtime so accept/decline shows without refresh.

### Edge Functions

Skip until a **secret** is needed (Resend, Stripe later). Booking rules stay in Postgres so they run even if someone calls the REST API with the anon key.

## 5. Deployment and environments

| Env        | Frontend           | Backend                                                                     |
| ---------- | ------------------ | --------------------------------------------------------------------------- |
| Local      | `vite`             | **Supabase CLI** (`supabase start`) so development is not only against prod |
| Preview    | Vercel preview URL | Same non-prod Supabase project, or branch DB later                          |
| Production | Vercel prod domain | Prod Supabase project                                                       |

Also:

- **GitHub** as the Vercel source
- **Two Supabase projects** (dev/prod) so migrations do not hit live users
- **`supabase/migrations`** in git as source of truth
- **Seed:** one fixed city (`Samundri`), approved localities within about 5–10 km, categories, admin, demo provider/listing, demo customer
- **Custom domain** on Vercel + Auth redirect URLs (`Site URL`, additional redirects) matching that domain
- **Backups:** Supabase PITR on paid; at least daily backups before launch
- **Error tracking:** Sentry (optional, easy to forget)
- **Uptime:** Vercel + Supabase status

PRD said “self-hosted friendly.” Hosted Supabase is the fast path. Local CLI is the escape hatch; full self-host of Supabase is a later ops decision, not MVP.

## 6. Data flow (happy path)

1. Guest searches listings (anon, RLS).
2. Register → Auth → profile + role.
3. Customer `create_booking` RPC → row `requested` + notification for provider.
4. Provider `accept_booking` → `accepted`; customer can see phone if that open decision is kept.
5. Provider `complete_booking` → `completed`.
6. Customer `submit_review` → review + rating rollup.
7. Admin hides review / deactivates listing via admin RPC.

## 7. Trust and PII

- Phone not on public listing unless opt-in; share after accept if that default is kept.
- Booking address never in listing payloads.
- Non-parties should not learn that a booking id exists if it can be avoided.
- Rate-limit Auth in Supabase; later cap `create_booking` so inboxes cannot be spammed.

## 8. Explicitly out of this architecture (same as PRD)

No Stripe, no chat product, no maps SDK, no native apps, no Redis, no Kubernetes, no separate Node API.

Payments later: Stripe Checkout + webhook **Edge Function** using the service role; still no cards on Vercel.

## 9. Suggested repo (when code starts)

```text
/
  docs/PRD.md
  docs/architecture.md
  src/                 React app
  supabase/
    migrations/
    seed.sql
  vercel.json
```

One frontend package is enough. No monorepo required.

## 10. Build order

1. Schema + RLS + seed on local Supabase
2. Auth + profiles + roles
3. Listings + public search filtered by the selected Samundri locality
4. Booking RPCs + two inboxes
5. Reviews + aggregates
6. Admin + Storage
7. Vercel prod + Auth URLs + the launch city set to Samundri
