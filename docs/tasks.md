# Tasks

Implementation backlog for **LocalServe**. Format follows the attached checklist style. Scope comes from [PRD.md](./PRD.md), [architecture.md](./architecture.md), [database-design.md](./database-design.md), [security.md](./security.md), and [UI.md](./UI.md).

Check a box only when that item works, not when a file exists.

---

## Phase 1 – Setup (complete)

- [x] Create Vite + React + TypeScript project in the repo root
- [x] Install Tailwind and wire `index.css` + tokens from UI.md
- [x] Install React Router, TanStack Query, react-hook-form, Zod, supabase-js, lucide-react, date-fns, sonner
- [x] Add Inter font
- [x] Create `src/` folders (`pages`, `layouts`, `components`, `features`, `lib`)
- [x] Add `.env.example` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- [x] Add `.gitignore` for `.env` and `node_modules`
- [x] Init Supabase CLI and link (or local `supabase start`) — hosted Supabase is used through the supabase.com dashboard; local CLI/Docker setup is intentionally not required
- [x] Confirm app runs on `vite` with a blank shell (header placeholder)

> Note: dependencies install and the Vite shell run successfully from `C:\local-serve`. This project uses the hosted Supabase client configured in `.env`; local CLI linking and Docker/Podman are intentionally out of scope.

---

## Phase 2 – Database (partial)

- [ ] Create enums (`user_role`, `pricing_type`, `booking_status`, `notification_type`) — defined in the new baseline; fresh-database execution is not verified
- [ ] Create the nine application tables with documented checks, FKs, and indexes — defined in the new baseline; fresh-database execution is not verified
- [ ] Auth trigger: new user → `profiles` + `user_roles`, with customer/provider-only roles and Samundri-area fallback — hosted trigger verified 2026-09-28; baseline fresh-database execution and smoke test not run
- [ ] `updated_at` triggers and role/booking/listing helper functions — defined in the baseline; database execution not verified
- [x] Verify RLS enabled and inventory policies on all nine application tables — all nine enabled, none forced, 23 policies inspected on hosted Supabase 2026-09-28; authenticated behavior tests remain pending
- [ ] Grant only required public/authenticated columns/operations; keep phone/address restricted — hosted catalog shows excess `anon`/`authenticated` write grants on `listings` and `user_roles`, and `anon` SELECT grants on `bookings.address_text`; current row policies constrain reads/writes, but least-privilege grants need review
- [ ] Seed Samundri, approved areas, and reference categories — baseline seed is defined; fresh-database execution and current hosted catalog comparison are not verified
- [ ] Add a reproducible clean-database migration workflow and reconcile the existing hosted history without executing the baseline there — hosted history has nine incremental entries and does not list `20260926000000_baseline.sql`; full parity and fresh-baseline execution are not verified
- [ ] Deferred: identify/validate the admin account and separate demo provider/customer accounts — one hosted `user_roles.admin` row exists, but it cannot be mapped to the current operator
- [x] Generate TypeScript types from the linked hosted schema (`supabase gen types`)

> The earlier repository omitted the base DDL even though the hosted app and generated types reflected a populated schema. `20260926000000_baseline.sql` now defines the clean-project starting point. It is reconstructed from docs/types, has not been run on a fresh database, and must not be executed against the populated hosted project. The authenticated Dashboard catalog check on 2026-09-28 confirmed nine later hosted migration-history entries and nine RLS-enabled application tables, but also found grants/view differences; see [security.md](./security.md#hosted-supabase-verification--2026-09-28). The baseline is not listed as applied remotely.

---

## Phase 3 – RPCs and storage (partial)

- [x] `create_booking`
- [x] `accept_booking`
- [x] `decline_booking`
- [x] `cancel_booking`
- [x] `complete_booking`
- [x] `submit_review` + rating recompute
- [x] Apply party-authorized booking customer-name RPC migration to hosted Supabase
- [x] `add_marketplace_role`
- [x] `mark_notifications_read`
- [ ] Admin RPCs: listing active, profile active, review visibility, profile verified — migration and UI implemented locally; hosted deployment and rollback tests pending
- [x] Pin `search_path` on all `SECURITY DEFINER` functions
- [x] Storage bucket `listing-covers` + policies (own prefix upload, public read) — hosted bucket and all four policies verified 2026-09-28; cross-owner behavior tests remain pending
- [ ] Smoke-test RPCs in SQL (happy path + illegal transition)

---

## Phase 4 – App shell and auth (partial)

- [x] Supabase client (`lib/supabase.ts`)
- [x] Auth context (session, display name, roles)
- [x] Load active Samundri areas, default to first area, persist selection in `localStorage`
- [x] Re-filter Home and Search listings on area change
- [ ] Best-effort update the signed-in profile area when the picker changes
- [x] `PublicLayout`
- [ ] `AppLayout` / `AdminLayout`
- [x] Header (logo, location picker, responsive mobile menu, login/sign up, signed-in identity/role menu, logout)
- [x] Footer (product, category, privacy, and terms links; no NADRA / hotline)
- [x] Register page (email, password, name, fixed Samundri city + approved locality dropdown, role)
- [x] Login page with same-origin relative `?next=` validation
- [x] Logout
- [x] Protected route guards for account, bookings, customer booking requests, provider, and admin + `?next=` (same-origin only)
- [x] Hide provider/admin navigation unless role exists
- [x] Toast provider (Sonner)

---

## Phase 5 – Profiles and account (partial)

- [x] Load profile after login
- [x] Account page: view and edit display name, phone, selected Samundri locality, bio
- [x] Block editing `is_verified` / `is_active` from the client
- [x] “Also list services” → `add_marketplace_role('provider')`
- [x] Inactive user: show RPC errors clearly

> Phase 5 account UI and RPCs are implemented and deployed. Guest access redirects correctly; authenticated profile-save and provider-role interactions still need a signed-in manual test.

---

## Phase 6 – Catalog (implementation complete; hosted data verification pending)

- [x] Fetch active Samundri city and active categories
- [x] Provider: create listing form
- [x] Provider: edit listing
- [x] Provider: deactivate listing
- [x] Cover image upload to Storage (migration and policies applied to hosted Supabase)
- [x] Public listing queries (selected Samundri locality required, active only) on Home and Search
- [x] Search params: category, `q`, area, min rating, price range, sort, page
- [x] Home page: Samundri hero/search, category cards, top rated listings, how it works
- [x] Home page: recent reviews section
- [x] Search results page
- [x] Listing detail page (no public phone)
- [x] Public provider profile with About Me, Services, and Reviews tabs using public profile/listing/review data
- [x] Listing card component (Request booking + View)
- [x] Empty, skeleton, and error states for Home and Search result lists
- [x] 404 page

> Top Rated remains filtered to the selected locality, as UI.md specifies. The demo seed and its alignment migration place matching demo listings in the first active Samundri locality. The hosted rows were not checked in this pass; rerun the seed if they remain split across areas.

---

## Phase 7 – Bookings (partial)

- [x] Request booking page/form
- [x] Guest request → login with return URL
- [x] Block booking own listing in UI (RPC still enforces)
- [x] Customer bookings list + status filters
- [x] Customer booking detail (address; phone only after accepted)
- [x] Customer cancel
- [x] Provider requests inbox
- [x] Provider accept / decline (reason) / complete
- [x] Provider cancel accepted job
- [x] Status badges with text labels
- [x] Payment note copy (pay provider directly)
- [x] Invalidate queries after each RPC

> Phase 7 screens and actions are implemented and booking RPCs are deployed. Guest return routing was browser-checked; authenticated lifecycle tests remain pending because there is no shared test account. Demo listings are seeded.

---

## Phase 8 – Reviews and notifications (partial)

- [x] Review form on completed booking (stars + optional comment)
- [x] Show reviews on listing detail
- [x] Hide review section on home when none
- [x] Notification rows created by RPCs
- [x] Header bell + unread count
- [x] Mark notification read + navigate to booking
- [x] Poll notifications every 30s

> Phase 8 RPCs and client UI are implemented and deployed. Authenticated happy-path and illegal-transition tests remain pending because there is no shared test account.

---

## Phase 9 – Admin (partial)

- [x] Admin dashboard with database-backed summary and recent activity (read-only)
- [x] Admin layout/navigation and role-protected routes for dashboard, users, providers, listings, bookings, reviews, cities, categories, reports, and settings
- [x] Read-only users/providers/listings/bookings/reviews/cities/categories screens with search, supported filters, loading, empty, and error states
- [x] Booking record search and detail view; private address, phone, notes, and other users' emails are not selected for the UI
- [ ] Cities/category create, edit, and active-state changes — blocked pending narrow admin RPCs
- [ ] User deactivation and verification changes — local RPC/UI implemented; hosted deployment and authorization tests pending; Auth-user banning remains separate
- [ ] Listing deactivation — local RPC/UI implemented; hosted deployment and authorization tests pending
- [ ] Review hide/unhide with atomic rating recomputation — local RPC/UI implemented; hosted deployment and rating/authorization tests pending
- [ ] Admin RPCs for all write operations and minimal-field booking lookup — four requested RPCs implemented locally; city/category writes and booking lookup remain unimplemented
- [ ] Authenticated admin and non-admin runtime authorization verification — **NOT VERIFIED**

The panel now has write controls that call narrow admin RPCs; these controls are not usable until the new migration is deployed. The React role guard is only a UX gate; database calls must be authorized by `is_admin()` inside each RPC. No client-side direct DML was added. The hosted admin assignment exists but could not be mapped to an authenticated LocalServe browser account, and the agent's browser session is not the user's signed-in browser session. Therefore, authenticated admin rendering and denial behavior remain **NOT VERIFIED**.

Before implementing mutations, add and review narrow database-side operations that check `auth.uid()` plus `is_admin()` internally, pin `search_path = public`, revoke execution from `PUBLIC`/`anon`, and grant only `authenticated`. Return minimum required fields; do not expose other users' emails or booking address/notes. Review moderation must recompute listing aggregates from visible reviews in the same transaction. User deactivation must be enforced by all marketplace RPC/listing-write paths; any Auth session ban requires a trusted server-side Auth Admin operation, never a service-role key in Vite. Test each allowed action as admin and denial/no side effect as non-admin before enabling UI controls.

---

## Phase 10 – Security checks (manual, pending)

- [ ] Anon cannot select bookings
- [x] Anonymous phone-column request for one public provider profile is rejected (HTTP 401, 2026-09-28); hosted catalog also shows no anon `profiles.phone` SELECT grant and no anon profile SELECT policy
- [ ] User B cannot accept User A’s booking
- [x] Anonymous `create_booking` RPC request is rejected (HTTP 401, 2026-09-28; no write)
- [ ] Direct `update` on `bookings.status` fails — no authenticated test run recorded
- [ ] Direct `insert` into `reviews` fails — no authenticated test run recorded
- [ ] Insert `user_roles.admin` from client fails — no authenticated test run recorded
- [ ] Signup metadata `role=admin` does not grant admin — SQL smoke test exists but is not executed
- [ ] Cannot review before completed
- [ ] Duplicate review is rejected
- [ ] Cross-user booking read returns no row
- [ ] Illegal booking transitions are rejected
- [ ] Provider cannot modify another provider's listing
- [ ] Cannot upload to another provider’s storage path
- [ ] Admin RPCs reject non-admin callers (rollback-only test script added; execution pending deployment and a database session)
- [ ] `next` redirect cannot go off-site

> Hosted RLS flags, table policies, function grants, and Storage policies were inspected read-only on 2026-09-28 and documented in [security.md](./security.md#hosted-supabase-verification--2026-09-28). Runtime cross-user tests and the current operator's admin assignment remain unverified. Anonymous booking-table `SELECT` returned zero rows, but without a known booking fixture this is inconclusive.

---

## Phase 11 – Polish and deploy (partial)

- [ ] 375px and 1280px pass on home, search, listing, request, inbox
- [x] Document titles per UI.md
- [x] Privacy and Terms stub pages
- [x] `vercel.json` SPA rewrite
- [ ] Production Supabase project + env on Vercel
- [ ] Auth Site URL and redirect allowlist — hosted Site URL is `http://localhost:3000` and the redirect allowlist is empty; configure/verify production values before deployment
- [ ] Rotate seed admin password
- [ ] Confirm demo walkthrough: register → list → search → request → accept → complete → review

> Responsive checks found no horizontal overflow on Home, Search, or the available Listing not-found state at 375px and 1280px. Request and Inbox routes redirect guests at both widths; their authenticated content still needs a signed-in test account and booking data for final viewport verification.

---

## Out of scope (do not add tasks)

Payments, escrow, chat, maps, km radius, Urdu, NADRA marks, emergency hotline, native apps, `in_progress` UI.
