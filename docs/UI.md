# UI.md — Frontend decisions

**Product:** LocalServe  
**Status:** Locked for MVP unless this file is updated  
**Reference:** homepage mockups (visual tone only — not a feature checklist)  
**Depends on:** [PRD.md](./PRD.md), [architecture.md](./architecture.md), [database-design.md](./database-design.md), [security.md](./security.md)

This file is the **single source of truth for UI and frontend**. If a mock, conversation, or component disagrees with this document, this document wins. Do not re-open a decision in code; change this file first.

The earlier [ui-plan.md](./ui-plan.md) is a homepage sketch. **Implement against this file.**

---

## 0. Decision log (locked)

| #   | Topic                        | Decision                                                                                                                                                                                                                                                                              |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Product name in UI           | **LocalServe** (not “Service MarketPlace”)                                                                                                                                                                                                                                            |
| D2  | Tagline                      | Craftsman Trust & Verified Pros                                                                                                                                                                                                                                                       |
| D3  | Launch city shown by default | **Samundri** (active `cities` row). The app uses the approved list of Samundri localities in `database-design.md`, not free-text locations or distant towns.                                                                                                                          |
| D4  | Language                     | **English only**. No EN/Urdu toggle.                                                                                                                                                                                                                                                  |
| D5  | Currency display             | **Rs.** + amount, grouped (e.g. `Rs. 2,500`). ISO code `PKR` in data, not always on screen.                                                                                                                                                                                           |
| D6  | Geo                          | **Fixed Samundri city + locality selector only.** No km, maps, radius, “30 mins away,” or free-text location fields.                                                                                                                                                                  |
| D7  | Primary discovery CTA        | **Find a Service** (hero). Listing CTA: **Request booking** (not instant Book Now).                                                                                                                                                                                                   |
| D8  | Card secondary CTA           | **View** → listing detail                                                                                                                                                                                                                                                             |
| D9  | Trust badge                  | **Verified** iff `profiles.is_verified`. No NADRA, licenses, or government marks.                                                                                                                                                                                                     |
| D10 | Payments in UI               | **None.** Copy: pay the provider directly (cash/agreed method). No escrow, OTP, guarantee fund, hotline.                                                                                                                                                                              |
| D11 | How-it-works                 | Three PRD-true steps (search → request → confirm & review).                                                                                                                                                                                                                           |
| D12 | Emergency dispatch band      | **Do not build.**                                                                                                                                                                                                                                                                     |
| D13 | Become a provider            | Homepage text link + register with `role=provider`. No extra marketing route.                                                                                                                                                                                                         |
| D14 | Booking in-progress          | **Skip in UI.** Provider: Accepted → Complete. (DB may still have `in_progress` unused.)                                                                                                                                                                                              |
| D15 | Phone                        | Booking detail only, after status `accepted` (or later). Never on cards or listing public block.                                                                                                                                                                                      |
| D16 | Address                      | Booking request + booking detail only. Never on homepage/search.                                                                                                                                                                                                                      |
| D17 | Dual role                    | One account; nav shows customer + provider links when both roles exist.                                                                                                                                                                                                               |
| D18 | Admin                        | Same SPA, `/admin/*`, denser tables, same tokens. Not a separate app.                                                                                                                                                                                                                 |
| D19 | Stack                        | React 18 + **TypeScript** + Vite + Tailwind + React Router + TanStack Query + RHF + Zod + supabase-js + lucide-react + date-fns + Sonner toasts                                                                                                                                       |
| D20 | Deploy UI                    | Vercel static SPA, rewrite to `index.html`                                                                                                                                                                                                                                            |
| D21 | Font                         | **Inter** (Google or `fontsource`), UI only                                                                                                                                                                                                                                           |
| D22 | Dates                        | Store UTC; display in **browser local TZ** via `date-fns`                                                                                                                                                                                                                             |
| D23 | Listing image                | 4:3, `object-cover`; branded LocalServe placeholder if missing or unavailable                                                                                                                                                                                                        |
| D24 | Notifications                | Header bell; list from `notifications`; poll 30s; no realtime required                                                                                                                                                                                                                |
| D25 | Auth UI                      | Custom screens (not Supabase Auth UI kit)                                                                                                                                                                                                                                             |
| D26 | Categories on home           | Show up to **5** featured (highest listing count in selected city); “Browse all” for the rest                                                                                                                                                                                         |
| D27 | Top rated row                | **4** listings, sort rating then count                                                                                                                                                                                                                                                |
| D28 | Default search sort          | **newest** if `q` empty; if `q` present keep newest for MVP (no true relevance rank) — actually PRD said relevance default. **Decision:** `sort=rating` when no `q`; when `q` present still rating then title match is server-side ilike. UI default sort control: **Highest rated**. |
| D29 | 404                          | Dedicated page, header/footer, link home                                                                                                                                                                                                                                              |
| D30 | Legal                        | `/privacy` and `/terms` stub articles; footer links required                                                                                                                                                                                                                          |

---

## 1. Frontend architecture

### 1.1 Runtime

- SPA: Vite + React + TypeScript.
- Routing: `react-router-dom` v6. No Next.js.
- Data: `@tanstack/react-query` for server state; React context for **session** and **selected area** within the fixed Samundri launch city.
- Forms: `react-hook-form` + `zod` + `@hookform/resolvers`.
- Supabase: one browser client (`anon` key). Mutations that change bookings/reviews call **RPC** names from the database doc. No `update` on `bookings`/`reviews` from the client.
- Icons: `lucide-react`.
- Toasts: `sonner` (success/error). Validation errors stay on the form.
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` only.

### 1.2 Folder structure

```text
src/
  app/                 # providers: QueryClient, Auth, City, Router
  pages/               # one file per route
  layouts/             # PublicLayout, AppLayout, AdminLayout
  components/
    ui/                # Button, Input, Select, Modal, Badge, Skeleton
    listing/           # ListingCard, SearchBar, CategoryCard
    booking/           # StatusBadge, BookingActions
    layout/            # Header, Footer, LocationPicker
  features/            # hooks colocated by domain (auth, listings, bookings)
  lib/
    supabase.ts
    types.ts           # generated Database types
    money.ts           # formatRs
    datetime.ts
    paths.ts           # route helpers
  index.css            # Tailwind + CSS variables
```

No CSS-in-JS. No Redux. No UI kit (MUI/Chakra/shadcn) for MVP — Tailwind utilities + a small `components/ui` set.

### 1.3 Layouts

| Layout         | Used by                                                       | Chrome                                                           |
| -------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `PublicLayout` | `/`, `/search`, `/listings/:id`, `/login`, `/register`, legal | Header + footer; full-bleed only on `/` hero                     |
| `AppLayout`    | bookings, provider, account                                   | Header + footer; cream page; optional left subnav on ≥768px      |
| `AdminLayout`  | `/admin/*`                                                    | Header + left nav (Cities, Categories, Users, Listings, Reviews) |

Inner pages **do not** reuse the homepage hero.

### 1.4 Route table

| Path                                                                                  | Auth               | Page                          |
| ------------------------------------------------------------------------------------- | ------------------ | ----------------------------- |
| `/`                                                                                   | public             | Home                          |
| `/search`                                                                             | public             | Search results                |
| `/listings/:id`                                                                       | public             | Listing detail                |
| `/listings/:id/request`                                                               | customer           | Booking request form          |
| `/login`                                                                              | guest only         | Login                         |
| `/register`                                                                           | guest only         | Register                      |
| `/privacy` `/terms`                                                                   | public             | Stubs                         |
| `/account`                                                                            | any user           | Profile edit                  |
| `/bookings`                                                                           | customer (or dual) | List                          |
| `/bookings/:id`                                                                       | party              | Detail                        |
| `/provider/listings`                                                                  | provider           | My listings                   |
| `/provider/listings/new`                                                              | provider           | Create                        |
| `/provider/listings/:id/edit`                                                         | owner              | Edit                          |
| `/provider/requests`                                                                  | provider           | Inbox                         |
| `/admin`                                                                              | admin              | Redirect to `/admin/listings` |
| `/admin/cities` `/admin/categories` `/admin/users` `/admin/listings` `/admin/reviews` | admin              | Tables                        |
| `*`                                                                                   | public             | Not found                     |

Guests hitting protected routes → `/login?next={path}`. Logged-in users on `/login` → `/`.

Missing role (customer opens `/provider/*`) → message + CTA to add provider role.

---

## 2. Design system

### 2.1 Color tokens (Tailwind theme)

Map in `tailwind.config` / CSS variables:

| Token           | Hex (lock) | Use                                        |
| --------------- | ---------- | ------------------------------------------ |
| `--navy-950`    | `#0B1220`  | Header, footer, how-it-works               |
| `--navy-900`    | `#111827`  | Hero overlay (`bg-navy-950/70` over image) |
| `--cream-50`    | `#F6F1EA`  | App background                             |
| `--cream-100`   | `#EFE8DE`  | Subtle stripes / hover                     |
| `--white`       | `#FFFFFF`  | Cards, search pill                         |
| `--teal-600`    | `#0F766E`  | Primary buttons                            |
| `--teal-700`    | `#0D5E58`  | Primary hover                              |
| `--teal-50`     | `#F0FDFA`  | Badge fill                                 |
| `--ink`         | `#0F172A`  | Headings on cream                          |
| `--slate-600`   | `#475569`  | Body                                       |
| `--slate-400`   | `#94A3B8`  | Placeholders                               |
| `--amber-500`   | `#F59E0B`  | Stars                                      |
| `--rose-600`    | `#E11D48`  | Destructive (decline, deactivate)          |
| `--emerald-600` | `#059669`  | Success (accepted)                         |

Focus ring: `2px teal-600` offset 2px.

### 2.2 Type

- Font: Inter, 400/500/600/700.
- Hero H1: `text-4xl md:text-5xl font-semibold text-white tracking-tight`.
- Section H2: `text-2xl md:text-3xl font-semibold text-ink`.
- Eyebrow: `text-xs font-semibold uppercase tracking-wider text-slate-500` (on cream) / `text-teal-100` (on navy).
- Body: `text-sm md:text-base text-slate-600`.
- Do not mix a second display font.

### 2.3 Shape and elevation

- Radius: cards `rounded-2xl` (16px); buttons `rounded-xl`; inputs `rounded-lg`; search bar `rounded-full` on desktop, `rounded-2xl` stacked on mobile.
- Shadow: `shadow-sm` cards; `shadow-lg` search pill on hero.
- Content width: `max-w-6xl mx-auto px-4 md:px-6`.

### 2.4 Buttons

| Variant     | Classes intent                        | Use                                           |
| ----------- | ------------------------------------- | --------------------------------------------- |
| `primary`   | teal-600, white text, 44px min height | Find a Service, Request booking, Accept, Save |
| `secondary` | white, navy text, border              | View, Cancel (safe)                           |
| `ghost`     | transparent, white on navy header     | Log in                                        |
| `danger`    | rose outline or solid                 | Decline, Deactivate                           |

Disabled: 50% opacity, `pointer-events-none`. In-flight: spinner on the button, keep label.

### 2.5 Status badges (bookings)

Always **text + color**. Never color alone.

| Status                | Label                                    | Style      |
| --------------------- | ---------------------------------------- | ---------- |
| requested             | Waiting for provider                     | amber soft |
| accepted              | Confirmed                                | teal soft  |
| declined              | Declined                                 | slate      |
| completed             | Completed                                | emerald    |
| cancelled_by_customer | Cancelled by you / Cancelled by customer | slate      |
| cancelled_by_provider | Cancelled by provider                    | slate      |
| in_progress           | (hidden in UI)                           | —          |

Customer vs provider wording: “Waiting for provider” vs “New request”.

### 2.6 Motion

- Page transitions: none.
- Hover: 150ms color/shadow.
- No auto-playing carousels. Reviews on home: **3-column grid**, not a slider.

---

## 3. Global chrome

### 3.1 Header (all pages)

Left: logo wordmark **LocalServe** + small tagline (hide tagline `< md`).  
Center/right:

- **Location picker** — fixed dropdown of approved Samundri localities; city is fixed to Samundri for MVP. Changing the area updates context, `localStorage`, and re-filters the current page’s listings/search results immediately. If logged in, it updates the user’s `area_id` (best-effort PATCH) and re-filters the current page immediately.
- **Bell** — only if authenticated; unread count; dropdown last 10; click row → booking if `booking_id`.
- Guest: ghost **Log in**, primary **Sign up**.
- Auth: avatar initial (display name); menu: Account, My bookings, **My listings** / **Requests** if provider, **Admin** if admin, Log out.

Mobile: hamburger with the same items; location picker stays visible.

Header background: `navy-950` on all pages (consistent with reference). Text white. Teal Sign up.

### 3.2 Footer (all public + app pages; admin may use compact footer)

Three columns: Product (Home, Search, How it works `#how-it-works` on `/` only — from other pages link `/#how-it-works`), Popular categories (first 5 by sort_order), Support (Privacy, Terms).  
Bottom: © year LocalServe · Prices in PKR.  
**No** language switcher, **no** NADRA badge, **no** fake phone.

### 3.3 Toasts and errors

- RPC success: e.g. “Request sent.”
- RPC fail: map codes (`BOOKING_INVALID_TRANSITION` → “This booking cannot be updated.”) else “Something went wrong.”
- Network: retry on listing grids; toast on mutations.

---

## 4. Screen specifications

### 4.1 Home `/`

**Visual reference:** mock (hero photo, pill search, category cards, pro cards, dark how-it-works, review cards). Implement that **layout**. Bind real data. Do not copy false claims.

**Hero**

- Stock (or licensed) home-service photo; navy overlay.
- One badge only: **Verified local professionals** (static label, not a NADRA claim).
- Headline: `Trusted Local Services for a Better Home`.
- Sub: skilled professionals for everyday home needs — fast to request, easy to review.
- Search pill: Category (All services) | keyword | Samundri locality (synced with header location picker) | **Find a Service**.
- Popular chips: **four** static strings that run search `q=`: Generator wiring, AC gas refill, Kitchen leak, Deep cleaning.
- Become a provider → `/register?role=provider`.

**Catalog**

- Title: Explore trusted services.
- Count line: `{n} available in {area}` from DB.
- Cards: icon (lucide per slug), name, first ~60 chars of a fixed blurb map in frontend for known slugs, else description empty.
- Click → `/search?areaId=&categoryId=`.
- Browse all → `/search?areaId=` (no category).

**Top rated**

- Title: `Top rated in {area}`.
- 4 `ListingCard`s, `sort=rating`.
- View all → `/search?areaId=&sort=rating`.
- Empty: “No providers in {area} yet.”

**How it works** (`id="how-it-works"`)

Navy band, three columns:

1. Search your city
2. Request a time and address
3. Provider confirms; you review after the job

No guarantee dollar amount.

**Reviews**

- Title: Recent reviews.
- Up to 3 latest visible reviews: stars, listing title, excerpt (160 chars), author display name, city name.
- Empty: hide the whole section.

**Do not render:** emergency dispatch, hotline, accidental damage guarantee, NADRA, distances, “140+ pros” unless computed.

### 4.2 Search `/search`

Query params: `areaId` (required for the current Samundri locality filter; if missing use the current selected area), `categoryId`, `q`, `minRating`, `priceMin`, `priceMax`, `sort` (`rating` \| `price_asc` \| `price_desc` \| `newest`), `page`. The app does not allow free-text area entry; city stays fixed to Samundri for MVP.

Layout: left filter panel ≥768px; top stacked filters on mobile.

- Results: grid of `ListingCard` (2–3 columns).
- Pagination: prev/next + page numbers if `total > pageSize` (`pageSize = 20`).
- Empty: “No services match. Try another category or city.”
- SEO: document title `Services in {city}`.

### 4.3 Listing card (shared)

Always:

- 4:3 listing cover image; show the branded LocalServe placeholder when missing or unavailable
- Verified badge if provider verified
- Title (listing)
- Provider `display_name`
- Stars + `(count)` — if count 0, show “New”
- Price: `Rs. X` + ` / hr` if hourly else ` fixed`
- City name (not km)
- Buttons: **Request booking** | **View**

Never: response time, today slot, distance.

Inactive listings: not shown in public cards.

### 4.4 Listing detail `/listings/:id`

- Gallery: one 4:3 cover (large); show the branded LocalServe placeholder when missing or unavailable.
- Title, category, city, verified, rating, price, description, `availability_note` if present.
- Provider block: name, bio, verified. **No phone.**
- Primary **Request booking** (scrolls to form on same page for logged-in customer, or goes to `/listings/:id/request`).
  - **Decision:** separate route `/listings/:id/request` to keep detail clean.
- Guest: button → login with `next`.
- Owner viewing own listing: hide Request; show **Edit listing**.
- Reviews list under the fold (visible only).
- 404 if inactive and viewer is not owner/admin.

### 4.5 Public provider profile `/providers/:id`

- Public header: display name, initials avatar (no profile-photo field exists), Verified only when the admin flag is true, review summary from visible reviews, and service localities from active public listings.
- Tabs: About Me, Services, Reviews. Use keyboard-accessible tab navigation.
- About Me: provider bio and listing-backed service localities only. Never show email, phone, or home address.
- Services: active public listings using shared 4:3 listing cards; show an empty state when none are available.
- Reviews: only public, non-hidden reviews for this target provider; show up to 10 recent reviews, public reviewer display name when available, rating, text, and date. Average appears only when all ratings are available for exact calculation.
- Public discovery uses `get_public_provider_profiles`; profiles without an active public listing are unavailable by design.

### 4.6 Request booking `/listings/:id/request`

Fields: date, start time, optional end time, address (textarea), notes.  
Submit → `create_booking` → `/bookings/:id` + toast.  
Disable if own listing (should not reach here).

### 4.7 Auth

**Register:** email, password (min 8), display name, selected Samundri locality from the fixed dropdown, role radio Customer | Provider. City is fixed to Samundri in MVP and is not user-editable.
**Login:** email, password.  
Links between them. No social login.  
Password reset: “Forgot password” using Supabase recovery if configured; if not configured, hide the link.

### 4.8 Account `/account`

Display name, phone, Samundri locality, bio. Cannot edit verified/active. The user can change area from the navbar at any time; account settings reflect the current selected area but the city stays fixed to Samundri.
If only customer: button **Also list services** → `add_marketplace_role('provider')`.

### 4.9 Customer bookings

**List:** tabs or filter chips: All, Waiting, Confirmed, Completed, Cancelled. Rows: listing title, date, status, price snapshot. Click → detail.

**Detail:** status, schedule, address, notes, snapshot price, provider name, phone **if accepted+**, actions:

- requested: Cancel (optional reason)
- accepted: Cancel with reason
- completed: Review form if not yet reviewed (1–5 stars, comment optional ≥10 chars)
- declined: show reason, no actions

### 4.10 Provider listings

Table/cards of own listings including inactive. Create / Edit form: category, city, title, description, pricing type, amount, duration optional, availability note, cover upload (jpeg/png/webp). Deactivate toggle. Ratings read-only.

### 4.11 Provider requests `/provider/requests`

Default filter: New (`requested`). Also Upcoming (`accepted`), Done, Declined/Cancelled.

Detail/drawer or page:

- Customer display name, schedule, address, notes, snapshot price
- requested: **Accept** | **Decline** (reason required)
- accepted: **Mark complete** | Cancel with reason
- completed: read-only

Dashboard counts at top: new, upcoming, completed this month.

### 4.12 Admin

Tables with search. Actions: deactivate user/listing, hide/unhide review, toggle city/category active, set verified. Booking lookup by id (paste UUID).  
No public design reference — use navy header + cream + teal, compact `text-sm` tables.

### 4.13 Empty / loading / error (global)

| Situation                  | UI                                                                     |
| -------------------------- | ---------------------------------------------------------------------- |
| First paint lists          | Skeleton cards (same grid), not a centered spinner                     |
| Mutation                   | Button loading                                                         |
| Forbidden                  | “You don’t have access.” + home                                        |
| Not found                  | 404 illustration-less: headline + home button                          |
| Banned (`is_active` false) | Auth still may work until Auth ban; RPCs fail → toast and contact copy |

---

## 5. Copy deck (canonical strings)

Use these so the mock’s escrow/NADRA language never lands in the repo.

| Place                        | Copy                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| Hero sub                     | Find trusted professionals in your city. See prices and reviews, then request a time that works. |
| How it works 1               | Choose a city and service. Compare listings and ratings.                                         |
| How it works 2               | Send a booking request with your time, address, and notes.                                       |
| How it works 3               | The provider accepts or declines. When the job is done, leave a review.                          |
| Request success              | Your request was sent. You’ll see an update when the provider responds.                          |
| Pay note (booking confirmed) | Agree payment directly with your provider. LocalServe does not take payment in this version.     |
| Verified tooltip             | This provider was marked verified by LocalServe.                                                 |

---

## 6. Responsive breakpoints

| Name | Width | Rules                                                                    |
| ---- | ----- | ------------------------------------------------------------------------ |
| sm   | 640   | —                                                                        |
| md   | 768   | 2-col listing grids; header expands                                      |
| lg   | 1024  | 3–4 listing cards; 5 category cards; how-it-works 3-col; admin split nav |

Mobile search pill: stack category, q, city, button (full width).  
Tap targets ≥ 44px.

---

## 7. Accessibility

- `html lang="en"`.
- Visible labels on every input (placeholder is not a label).
- Listing cards are a heading + links, not a clickable `<div>`.
- Stars: `aria-label="4.5 out of 5 from 12 reviews"`.
- Modals: focus trap, Escape closes (decline reason, cancel reason).
- Do not rely on color for status (D from §2.5).
- Skip link: “Skip to content”.

---

## 8. Client data and security (UI implications)

- Select public listings/reviews via RLS; never `select('*')` on `profiles` for another user — use public fields only (`profiles_public` or explicit columns).
- Booking address/phone only after fetch of a booking the user can see.
- Redirect `next` must be a same-origin relative path (prevent open redirect).
- Do not render review HTML; text only.
- Image URLs only from Supabase storage public URL helper, not arbitrary `javascript:`.
- Log out: `supabase.auth.signOut()` and clear query cache.

---

## 9. SEO and document titles

SPA: `document.title` per route.

| Route   | Title                               |
| ------- | ----------------------------------- |
| Home    | LocalServe — Trusted local services |
| Search  | {Category?} in {Area} · LocalServe  |
| Listing | {title} · LocalServe                |
| Default | LocalServe                          |

Meta description on index.html generic; no SSR for MVP.

---

## 10. What we will not add in the frontend (MVP)

- i18n / RTL Urdu layout
- Google Maps / Places
- Chat widget
- Stripe / wallet UI
- Native app / PWA install prompt
- Dark mode toggle (header is already dark; pages stay cream)
- Infinite scroll (use pagination)
- Confetti, chatbots, NADRA logos, fake live-availability dots

---

## 11. Build order (frontend)

1. Tailwind tokens, Header, Footer, Router, Auth context, area context
2. Home wired to Supabase (cities, areas, categories, listings, reviews)
3. Search + listing detail + `ListingCard`
4. Register / login / account
5. Request booking + my bookings + review form
6. Provider listings CRUD + requests inbox
7. Admin tables
8. Empty/error/404 polish on a 375px and 1280px pass

---

## 12. Definition of done for a screen

- Matches tokens and copy in this file
- Loading, empty, and error states exist
- Works at 375px and 1280px
- Actions call the documented RPC/table, not a shortcut update
- No mock-only claims (distance, escrow, NADRA, hotline)
