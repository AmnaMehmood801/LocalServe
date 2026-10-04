# Security

**Product:** LocalServe  
**Status:** Draft for MVP  
**Based on:** [PRD.md](./PRD.md), [architecture.md](./architecture.md), [database-design.md](./database-design.md)

This document is the threat model and control set for **the database, schema, RLS, RPCs, Storage, and secrets**. The Vite app is untrusted. If a control only exists in React, it does not count.

This is not a PCI, ISO 27001, or legal privacy opinion. Payments are out of MVP; adding them requires a new review.

**Verification status (2026-09-28):** A read-only SQL Editor inspection was completed in the authenticated Supabase Dashboard for project `LocalServe` (`pvmgpjesfgjlhmhgwfbq`, production branch `main`). It verified hosted catalog state, but did not execute the repository baseline against a fresh database or perform authenticated cross-user behavior tests. The Dashboard SQL Editor ran as `postgres` with `auth.uid() = NULL`; this cannot identify the current LocalServe application account. No hosted settings or objects were changed.

## Hosted Supabase Verification — 2026-09-28

**Scope:** read-only verification through the authenticated Dashboard SQL Editor and project settings. Only catalog `SELECT` queries were executed. The baseline migration `20260926000000_baseline.sql` was not applied, executed against the hosted project, or marked as applied.

### Verified

- **Project identity:** Dashboard displayed `LocalServe`, project ref `pvmgpjesfgjlhmhgwfbq`, production branch `main`.
- **RLS:** all nine application tables (`areas`, `bookings`, `categories`, `cities`, `listings`, `notifications`, `profiles`, `reviews`, `user_roles`) have RLS enabled; none has FORCE ROW LEVEL SECURITY enabled.
- **Policies:** all 23 deployed `public` policies were read from `pg_policies`; the exact inventory is below. There is no `INSERT`, `UPDATE`, or `DELETE` policy on `user_roles`, and no `DELETE` policy on `listings`.
- **Bookings/reviews DML grants:** `anon` and `authenticated` have no direct `INSERT`, `UPDATE`, or `DELETE` privilege on `bookings` or `reviews`.
- **Sensitive grants:** `anon` cannot select `profiles.phone`; `authenticated` has column-level `SELECT` on `profiles.phone`, but the only `profiles` SELECT policy is self-or-admin. `anon` does have a column-level `SELECT` privilege on `bookings.address_text` and table-level `SELECT` on `bookings`; RLS has no anon booking-read policy, so the catalog relies on RLS to prevent anonymous row access.
- **Excess grants requiring least-privilege review:** both `anon` and `authenticated` have table-level `INSERT`/`UPDATE`/`DELETE` privileges on `listings` and `user_roles`. Active RLS policies constrain listing writes to authenticated providers and provide no `user_roles` write policy, but the grants are broader than the intended least-privilege design.
- **Public profile view:** `profiles_public` exists, is owned by `postgres`, is granted to `anon` and `authenticated`, and projects only `id`, `display_name`, `bio`, `city_id`, and `is_verified`. Its hosted options are `security_barrier=true` and `security_invoker=true`. The only deployed `profiles` SELECT policy is `profiles_select_self_or_admin` for `authenticated`; there is no public-profile or booking-counterpart SELECT policy. This differs from the repository baseline's owner-executed view and blocks other users' profile rows under invoker RLS.
- **RPCs and functions:** all inspected `SECURITY DEFINER` functions are owned by `postgres` and pin `search_path=public`. Booking creation/transitions, review submission, profile update, role-addition, and notification-read functions require authenticated execution and reject anon execution. The customer-name RPC is authenticated-only and has no `service_role` EXECUTE grant. `get_public_provider_profiles` is executable by anon/authenticated and returns only `id`, `display_name`, `bio`, and `is_verified`; `has_role`, `is_admin`, `is_booking_party`, and `is_public_listing` are also executable by anon/authenticated. Function grants are inventoried below.
- **Function behavior inspected:** `create_booking` uses the current user as customer, requires customer role/active profile, rejects self-booking and inactive catalog/provider/listing rows, and snapshots listing title/pricing. `accept_booking`, `decline_booking`, `cancel_booking`, and `complete_booking` enforce party/role/status checks. `submit_review` requires the booking customer, an active customer profile, a completed booking, and no existing review; it recomputes rating aggregates. `add_marketplace_role` only accepts `customer` or `provider`, never `admin`. `get_booking_customer_names` limits results to the booking parties. The deployed `auth.users` trigger `on_auth_user_created` calls `handle_new_user`; missing/invalid area metadata falls back to an active Samundri area, and signup role metadata is restricted to customer/provider.
- **Storage:** bucket `listing-covers` exists and is public, with a 2 MiB limit and JPEG/PNG/WebP allow-list. Four `storage.objects` policies are deployed: authenticated insert/update/delete require the first path segment to equal `auth.uid()`; public SELECT is allowed for every object in the bucket.
- **Admin assignment:** there is exactly one row with role `admin` in `public.user_roles`. The Dashboard operator's application account cannot be mapped from the SQL Editor session. **Admin role: NOT VERIFIED** for the current user.
- **Advisors:** Security Advisor showed 0 errors, 22 warnings, 0 info suggestions. Observed warnings include `Public Bucket Allows Listing` for `storage.listing-covers`, public execution of `SECURITY DEFINER` helpers (`get_public_provider_profiles`, `has_role`, `is_admin`, `is_booking_party`, `is_public_listing`), and signed-in execution of security-definer RPCs. Performance Advisor showed 0 errors, 14 warnings, and 10 info suggestions. Warnings include `Auth RLS Initialization Plan` on application tables; info findings include unindexed foreign keys and unused indexes.
- **Auth configuration:** the Dashboard showed Email enabled, signups enabled, email confirmation enabled, anonymous sign-ins disabled, manual linking disabled. Site URL is `http://localhost:3000`; the redirect allowlist is empty. This is not production Vercel Auth configuration.
- **Hosted migration history:** `supabase_migrations.schema_migrations` contains these nine entries: `20260926180000 listing_covers_bucket`, `20260926190000 create_booking_rpc`, `20260927090000 booking_transition_rpcs`, `20260927100000 account_profile_rpcs`, `20260927110000 review_notification_rpcs`, `20260927130000 demo_listings_default_area`, `20260928130000 booking_customer_names_rpc`, `20260928140000 revoke_booking_customer_names_service_role`, and `20260928150000 public_listing_provider_profiles_rpc`. The repository baseline version `20260926000000` is not in this hosted history.
- The earlier anonymous API probes remain unchanged and were not rerun: anonymous `create_booking` returned HTTP 401; anonymous provider-phone read returned HTTP 401.

#### Advisor findings observed

| Advisor finding                                       | Severity        | Affected object(s)                                                                                                           | Recommendation shown / follow-up                                                                                                                                                                                                                                                   |
| ----------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public Bucket Allows Listing                          | Warning         | `storage.listing-covers`                                                                                                     | The broad public SELECT policy permits clients to list all files in the bucket; restrict listing if public enumeration is not intended.                                                                                                                                            |
| Public Can Execute SECURITY DEFINER Function          | Warning         | `get_public_provider_profiles`, `has_role`, `is_admin`, `is_booking_party`, `is_public_listing`                              | Revoke EXECUTE, use SECURITY INVOKER, or move out of exposed API schema if anonymous invocation is not intended; review each helper's API need and body rather than applying a blanket change.                                                                                     |
| Signed-In Users Can Execute SECURITY DEFINER Function | Warning         | Authenticated-executable functions listed in the function inventory                                                          | Supabase recommends revoke EXECUTE, use SECURITY INVOKER, or move from exposed API schema if signed-in calls are not intended. The booking/review/account/role RPCs are intended client APIs and contain explicit caller/role/ownership checks; assess each function individually. |
| Auth RLS Initialization Plan                          | Warning         | Application-table RLS policies; observed on `profiles`, `user_roles`, `reviews`, `listings`, `bookings`, and `notifications` | Review repeated `auth`/`current_setting()` evaluation in policy expressions; consider a query-plan-safe init-plan form only after behavior and query plans are tested.                                                                                                             |
| Unindexed foreign keys                                | Info suggestion | `categories`, `listings`, `notifications`, `profiles`, `reviews`                                                             | Review the specific FK constraints and workload, then add covering indexes where useful.                                                                                                                                                                                           |
| Unused indexes                                        | Info suggestion | `profiles`, `listings`, `bookings`                                                                                           | Review index usage and workload before dropping; no indexes were changed.                                                                                                                                                                                                          |

### Not Verified

- Which of the single hosted `admin` assignment belongs to the current Dashboard operator; the SQL Editor used role `postgres` and returned `auth.uid() = NULL`.
- Runtime behavior of cross-user reads/writes, direct profile-phone access by booking parties, view access through PostgREST, Storage ownership denial, and all other authenticated security tests in §12. Catalog policy inspection is not a substitute for those tests.
- Exact hosted reference-data rows (cities, areas, categories), full schema parity against every object in the baseline, and successful execution of the baseline on a fresh database.
- Details of all 10 Performance Advisor info suggestions; their count and representative findings were observed, but all individual suggestion rows were not captured.
- Password-specific Auth policy details beyond the Dashboard's enabled Email provider; no Auth setting was changed.

### Blocked

Behavioral tests requiring two authenticated LocalServe accounts remain blocked because no such test-account session was available. Fresh-baseline execution requires a disposable fresh database, not the existing hosted project. Do not share credentials in chat or place service-role/database credentials in Vite variables or source files.

### Evidence and migration-history distinction

- Repository migration files: one reconstructed baseline plus nine existing incremental migrations.
- Hosted migration history: nine incremental entries listed above; the baseline is absent. This verifies only the recorded migration history, not that every deployed object exactly matches any migration file.
- Deployed objects: catalog `SELECT` queries confirmed the objects and policies summarized above. A partial comparison is not proof of full baseline parity; in particular, the hosted `profiles_public` view uses `security_invoker=true`, while the repository baseline specifies `security_invoker=false`.
- **Hosted changes made: NONE.** No table, policy, function, trigger, grant, role, migration history, Storage object, Auth setting, or deployment was changed.

### Deployed public-table policies

`NULL` means that policy expression does not apply to that command.

| Table         | Policy                                      | Command | Roles               | USING                                                                      | WITH CHECK                                                                                                                                                                                                                       |
| ------------- | ------------------------------------------- | ------- | ------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --------------- |
| areas         | `areas_admin_insert`                        | INSERT  | authenticated       | NULL                                                                       | `is_admin()`                                                                                                                                                                                                                     |
| areas         | `areas_admin_update`                        | UPDATE  | authenticated       | `is_admin()`                                                               | `is_admin()`                                                                                                                                                                                                                     |
| areas         | `areas_select_active`                       | SELECT  | anon, authenticated | `((is_active = true) OR is_admin())`                                       | NULL                                                                                                                                                                                                                             |
| bookings      | `bookings_select_party_or_admin`            | SELECT  | authenticated       | `((customer_id = auth.uid()) OR (provider_id = auth.uid()) OR is_admin())` | NULL                                                                                                                                                                                                                             |
| categories    | `categories_admin_insert`                   | INSERT  | authenticated       | NULL                                                                       | `is_admin()`                                                                                                                                                                                                                     |
| categories    | `categories_admin_update`                   | UPDATE  | authenticated       | `is_admin()`                                                               | `is_admin()`                                                                                                                                                                                                                     |
| categories    | `categories_select_active`                  | SELECT  | anon, authenticated | `((is_active = true) OR is_admin())`                                       | NULL                                                                                                                                                                                                                             |
| cities        | `cities_admin_insert`                       | INSERT  | authenticated       | NULL                                                                       | `is_admin()`                                                                                                                                                                                                                     |
| cities        | `cities_admin_update`                       | UPDATE  | authenticated       | `is_admin()`                                                               | `is_admin()`                                                                                                                                                                                                                     |
| cities        | `cities_select_active`                      | SELECT  | anon, authenticated | `((is_active = true) OR is_admin())`                                       | NULL                                                                                                                                                                                                                             |
| listings      | `listings_insert_provider_owner`            | INSERT  | authenticated       | NULL                                                                       | `((provider_id = auth.uid()) AND has_role('provider'::user_role) AND (EXISTS (SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND p.is_active))) AND ((cover_image_path IS NULL) OR (cover_image_path ~~ ((auth.uid())::text |     | '/%'::text))))` |
| listings      | `listings_select_owner_or_admin`            | SELECT  | authenticated       | `((provider_id = auth.uid()) OR is_admin())`                               | NULL                                                                                                                                                                                                                             |
| listings      | `listings_select_public_active`             | SELECT  | anon, authenticated | `is_public_listing(id)`                                                    | NULL                                                                                                                                                                                                                             |
| listings      | `listings_update_provider_owner`            | UPDATE  | authenticated       | `((provider_id = auth.uid()) AND has_role('provider'::user_role))`         | `((provider_id = auth.uid()) AND has_role('provider'::user_role) AND ((cover_image_path IS NULL) OR (cover_image_path ~~ ((auth.uid())::text                                                                                     |     | '/%'::text))))` |
| notifications | `notifications_select_own`                  | SELECT  | authenticated       | `(user_id = auth.uid())`                                                   | NULL                                                                                                                                                                                                                             |
| notifications | `notifications_update_own`                  | UPDATE  | authenticated       | `(user_id = auth.uid())`                                                   | `(user_id = auth.uid())`                                                                                                                                                                                                         |
| profiles      | `profiles_select_self_or_admin`             | SELECT  | authenticated       | `((id = auth.uid()) OR is_admin())`                                        | NULL                                                                                                                                                                                                                             |
| profiles      | `profiles_update_self`                      | UPDATE  | authenticated       | `(id = auth.uid())`                                                        | `(id = auth.uid())`                                                                                                                                                                                                              |
| reviews       | `reviews_select_admin`                      | SELECT  | authenticated       | `is_admin()`                                                               | NULL                                                                                                                                                                                                                             |
| reviews       | `reviews_select_author`                     | SELECT  | authenticated       | `(author_id = auth.uid())`                                                 | NULL                                                                                                                                                                                                                             |
| reviews       | `reviews_select_visible`                    | SELECT  | anon, authenticated | `(is_hidden = false)`                                                      | NULL                                                                                                                                                                                                                             |
| reviews       | `reviews_select_visible_or_author_or_admin` | SELECT  | anon, authenticated | `((NOT is_hidden) OR (author_id = auth.uid()) OR is_admin())`              | NULL                                                                                                                                                                                                                             |
| user_roles    | `user_roles_select_self_or_admin`           | SELECT  | authenticated       | `((user_id = auth.uid()) OR is_admin())`                                   | NULL                                                                                                                                                                                                                             |

### Function execution inventory

All listed functions are owned by `postgres`; all have `search_path=public`. `SECDEF` is `SECURITY DEFINER`; `anon`, `auth`, and `service` columns indicate effective EXECUTE privilege.

| Function                       | SECDEF | anon | auth | service |
| ------------------------------ | ------ | ---- | ---- | ------- |
| `accept_booking`               | yes    | no   | yes  | yes     |
| `add_marketplace_role`         | yes    | no   | yes  | yes     |
| `cancel_booking`               | yes    | no   | yes  | yes     |
| `complete_booking`             | yes    | no   | yes  | yes     |
| `create_booking`               | yes    | no   | yes  | yes     |
| `decline_booking`              | yes    | no   | yes  | yes     |
| `get_booking_customer_names`   | yes    | no   | yes  | no      |
| `get_public_provider_profiles` | yes    | yes  | yes  | no      |
| `handle_new_user`              | yes    | no   | no   | yes     |
| `has_role`                     | yes    | yes  | yes  | yes     |
| `is_admin`                     | yes    | yes  | yes  | yes     |
| `is_booking_party`             | yes    | yes  | yes  | yes     |
| `is_public_listing`            | yes    | yes  | yes  | yes     |
| `mark_notifications_read`      | yes    | no   | yes  | yes     |
| `set_updated_at`               | no     | yes  | yes  | yes     |
| `submit_review`                | yes    | no   | yes  | yes     |
| `update_account_profile`       | yes    | no   | yes  | yes     |

### Deployed Storage policies

| Policy                        | Command | Role          | USING                                                                                             | WITH CHECK                                                                                        |
| ----------------------------- | ------- | ------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `listing_covers_owner_delete` | DELETE  | authenticated | `((bucket_id = 'listing-covers'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))` | NULL                                                                                              |
| `listing_covers_owner_insert` | INSERT  | authenticated | NULL                                                                                              | `((bucket_id = 'listing-covers'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))` |
| `listing_covers_owner_update` | UPDATE  | authenticated | `((bucket_id = 'listing-covers'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))` | `((bucket_id = 'listing-covers'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))` |
| `listing_covers_public_read`  | SELECT  | public        | `(bucket_id = 'listing-covers'::text)`                                                            | NULL                                                                                              |

### Hosted findings requiring follow-up

- The deployed `profiles_public` view is invoker-security, not the owner-executed view described by the baseline. Combined with the deployed self/admin-only `profiles` SELECT policy, it does not allow anon or other authenticated users to see another user's public profile row. `BookingDetailPage.tsx` also reads the provider's `profiles.phone` directly after booking acceptance, but the deployed profile policy has no booking-party allowance. These catalog facts indicate a likely public-profile/name and accepted-booking phone-display regression; confirm with an authenticated runtime test before choosing a database repair.
- The Security Advisor's 22 warnings include public listing of the public image bucket and anon/authenticated execution of security-definer functions. The checked RPC bodies contain identity/role/ownership checks, but the exposed helpers and broad table grants should be reviewed individually; no blanket advisor recommendation was applied.
- The Performance Advisor reports 14 RLS initialization-plan warnings and 10 info suggestions, including unindexed foreign keys on categories/listings/notifications/profiles/reviews and unused indexes on profiles/listings/bookings. No performance change was made.

## Admin panel implementation — 2026-09-28

- The `/admin` UI now has read-only dashboard, user, provider, listing, booking, review, city, category, report, and settings screens.
- Browser queries select only the fields needed for those views. The user screens do not request other users' Auth email; booking list/detail screens omit phone, address, and notes. The settings screen may show the signed-in admin's own email from the active Auth session.
- At the time of this 2026-09-28 inspection, the app had no admin write RPCs. On 2026-09-30, four narrow admin RPCs were added locally for listing activation, profile activity, review visibility, and profile verification. `admin_set_review_visible` recomputes listing rating aggregates in the same transaction. These migrations have not been deployed or behavior-tested. City/category mutations and booking lookup remain unavailable. Review moderation must recalculate listing aggregates atomically.
- The route guard checks the signed-in role for navigation, but that frontend check is not treated as authorization. Table reads are still subject to the deployed admin-scoped RLS policies. The new local RPC migration revokes execution from `PUBLIC`, `anon`, and `service_role`, then grants it to `authenticated`; each function checks `is_admin()` internally. No hosted RLS, grant, function, role, or other setting was changed as part of this implementation.
- **Authenticated admin runtime verification: NOT VERIFIED.** The available app tabs did not contain the authenticated LocalServe sessions shown in the user's normal browser. No role assignment was changed, and no admin data query was authenticated in the browser during this implementation.

## 1. Principles

1. The browser must hold only the **anon/publishable key** and the user’s JWT. It must never hold the **service role** key.
2. **Row Level Security must remain on for every exposed `public` table.** No exceptions.
3. Booking status and reviews must change only through **RPCs**. Direct `INSERT`/`UPDATE`/`DELETE` on `bookings` and `reviews` must be revoked from `anon` and `authenticated`.
4. Privilege is **resource-based** (owner, booking party, admin), not “any logged-in user.”
5. PII (phone, booking address, email) is not public catalog data.
6. Fail closed: unknown booking id → no row (prefer empty result over a leaky 403 that confirms existence to strangers).
7. `SECURITY DEFINER` functions are trusted code: pin `search_path`, check `auth.uid()`, never trust arguments for identity.

## 2. Assets and trust boundaries

| Asset                                | Why it matters                                   |
| ------------------------------------ | ------------------------------------------------ |
| `auth.users` password hashes / email | Account takeover                                 |
| `profiles.phone`                     | Contact PII                                      |
| `bookings.address_text`, `notes`     | Home/work location PII                           |
| `bookings` status machine            | Fake completes, review fraud, ghosting customers |
| `user_roles` especially `admin`      | Full catalog and PII                             |
| `listings.rating_*`                  | Trust manipulation                               |
| `listing-covers` objects             | XSS via SVG/HTML, malware                        |
| Service role key                     | Bypasses RLS; equivalent to root on app data     |

```text
Untrusted                         Trusted
─────────                         ───────
Vite SPA / DevTools               Supabase Auth
anon key + user JWT               Postgres + RLS
anyone who captured a JWT         RPCs (definer, after checks)
                                  Storage policies
                                  service_role (operators only)
```

A user who can run SQL as `authenticated` via PostgREST (Supabase JS) **will**. Design as if they never open the UI.

## 3. Identity and secrets

| Control         | Rule                                                                                                                                                                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Passwords       | Supabase Auth (bcrypt internally). No password columns in `public`.                                                                                                                                                                                   |
| Session         | JWT from Auth; short-lived access token + refresh. Store in memory or a cookie you control; avoid long-lived tokens in `localStorage` if we later add XSS-heavy features. MVP: Auth client default is acceptable if we never render unsanitized HTML. |
| Signup metadata | Trigger reads `raw_user_meta_data.role` only if `customer` or `provider`. **Strip `admin`, `is_verified`, `is_active`.**                                                                                                                              |
| Admin           | Seeded; not a public signup path. Rotate seed password before production.                                                                                                                                                                             |
| Env             | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` only on Vercel. Service role in CI/Supabase dashboard/secret store, never `VITE_*`.                                                                                                                     |
| JWT secret      | Owned by Supabase; do not mint admin JWTs in the app.                                                                                                                                                                                                 |

**Banned users:** `profiles.is_active = false` is not enough if they still hold a JWT. Every RPC and listing insert **must** refuse inactive callers. Admin should also disable the Auth user (`banned` / delete) so refresh fails.

**Auth rate limits:** enable in the Supabase project (login, signup, recovery). Do not rely on the SPA.

## 4. Roles vs Auth

| Mechanism                   | Use                                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| `user_roles` table          | Source of truth for `customer` / `provider` / `admin`                                                 |
| JWT `app_metadata`          | Optional mirror **written only by Auth hooks / service role**. Never trust `user_metadata` for admin. |
| `is_admin()` / `has_role()` | `STABLE` + `SECURITY DEFINER` + `SET search_path = public` so RLS on `user_roles` does not recurse.   |

`add_marketplace_role` accepts only `customer` or `provider`. Grant `EXECUTE` to `authenticated`; function body rejects `admin`.

`get_public_provider_profiles` is an intentional public exception: grant `EXECUTE` to `anon` and `authenticated`, but return only its documented public fields for profiles with matching active listings in active city, area, and category rows. Never return phone or email.

Public provider profiles use that same RPC and are discoverable only while the provider has an active public listing. Profile pages read active listings and public reviews only; reviews are filtered by `target_provider_id` and `is_hidden = false`, which is also enforced by review-table RLS. Reviewer display names are fetched only from `profiles_public`; no phone, email, or address is selected. Profile photos are not currently part of the public profile schema.

## 5. `SECURITY DEFINER` (RPC) rules

PostgREST exposes functions with `EXECUTE` granted to `anon` or `authenticated`. Definer runs as the **owner** (typically `postgres` / `supabase_admin`) and **bypasses RLS** unless the body re-implements checks.

For every RPC in [database-design.md](./database-design.md) §8:

1. `SET search_path = public` (and nothing else) on the function. Prevents search-path hijack.
2. `IF auth.uid() IS NULL THEN RAISE ...` except no public booking RPCs.
3. Authorize using `auth.uid()` compared to row `customer_id` / `provider_id`, plus `has_role` / `is_admin()`.
4. Take **ids as arguments**, never “act as” a user id passed by the client.
5. Snapshot listing price/title **inside** `create_booking` from the listing row; ignore client-supplied price.
6. `create_booking` refuses if listing, city, category, or provider is inactive; refuses `auth.uid() = listing.provider_id`.
7. Admin RPCs start with `IF NOT is_admin() THEN RAISE insufficient_privilege`.
8. Grant `EXECUTE` to `authenticated` (and `anon` only if we ever add a public function—we should not). Revoke from `PUBLIC`.
9. Raise stable codes (`BOOKING_INVALID_TRANSITION`, `NOT_BOOKING_PARTY`, `NOT_ADMIN`) without leaking other users’ row contents.

Table owner of `bookings`/`reviews` should be a role that only these functions (and superuser) can write. If grants are wrong, RLS still denies client writes; do not drop that belt-and-suspenders.

## 6. Column-level PII (Postgres limitation)

**RLS is row-level, not column-level.** If a policy allows `SELECT` on a `profiles` row, the client can request `phone` unless we block it another way.

**Required pattern for MVP:**

| Data                           | How it is exposed                                                                                                                                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public profile                 | View `profiles_public`: `id, display_name, bio, city_id, is_verified` (no phone). Grant `SELECT` on the view to `anon`/`authenticated`; the repository baseline uses a security-barrier owner-executed projection and keeps direct profile rows behind RLS. |
| Public listing provider        | RPC `get_public_provider_profiles`: `id, display_name, bio, is_verified` only, and only for an active profile with a listing in active city/area/category.                                                                                                  |
| Own profile                    | Table `profiles`: caller may `SELECT`/`UPDATE` own row including `phone`.                                                                                                                                                                                   |
| Counterpart phone after accept | RPC `get_booking_contact(booking_id)` **or** view `booking_contacts` with RLS: only parties, and only if status ∈ `accepted`, `in_progress`, `completed`.                                                                                                   |
| Booking customer name          | RPC `get_booking_customer_names(booking_ids)`: only the booking's customer/provider parties; returns display names only, never phone. EXECUTE is granted to `authenticated` only.                                                                           |
| Address                        | Only on `bookings`. Strangers have no SELECT on that table. Do not add `address_text` to listings or notifications payload.                                                                                                                                 |

Revoke `SELECT` on `profiles.phone` from `anon` and from generic `authenticated` table grants if the table would otherwise leak; use column `GRANT`s and/or the public view. Do not “hide the column in React.”

Email stays in `auth.users`. The SPA must not query `auth.users`. Admin uses dashboard or a **security definer** admin RPC that returns email only to `is_admin()`.

## 7. Per-table controls

### 7.1 `cities` / `categories`

- Public read: `is_active = true`.
- Write: admin RPC or admin RLS only.
- Risk: inactive city still referenced by old listings — public listing SELECT must require **listing, city, and category** active (and provider `is_active`).

### 7.2 `profiles`

- Insert: Auth trigger only. Revoke INSERT from `anon`/`authenticated`.
- Update (owner): account changes use `update_account_profile`, which accepts only `display_name`, `phone`, `area_id`, and `bio`; it validates that the area is active and belongs to active Samundri. The fixed `city_id`, `is_verified`, `is_active`, and `id` are not client-editable.
- Update (admin): `is_active`, `is_verified` via RPC.
- SELECT: see §6. Guests never get phone.

### 7.3 `user_roles`

- SELECT: own rows; admin all.
- INSERT: trigger on signup + `add_marketplace_role`. Check constraint or trigger: `role <> 'admin'` for non-definer inserts.
- No UPDATE/DELETE from clients (cannot drop `provider` to escape jobs; revisit later).
- **Test:** authenticated `insert into user_roles (user_id, role) values (auth.uid(), 'admin')` must fail.

### 7.4 `listings`

- Public SELECT: `is_active` and related city/category/provider active.
- Owner SELECT: own rows including inactive.
- INSERT: `provider_id` **must equal** `auth.uid()` (forced in WITH CHECK, ignore client forge). Must `has_role('provider')`.
- UPDATE: owner cannot change `provider_id`, `rating_avg`, `rating_count`. Admin `is_active` via RPC.
- `cover_image_path` must stay under that provider’s storage prefix (validate in policy or trigger: path starts with `{auth.uid()}/`).

### 7.5 `bookings`

- No client DML.
- SELECT: `customer_id = auth.uid() OR provider_id = auth.uid() OR is_admin()`.
- UUID guessing: 128-bit ids; still do not put booking ids in public listing JSON. Notifications only to the recipient; payload may include **their** booking id.
- `create_booking` copies `provider_id` from the listing, not from the client.
- Inactive customer/provider cannot create or accept.

### 7.6 `reviews`

- No client DML.
- Public SELECT: `is_hidden = false`.
- Author SELECT: own review even if hidden (so they see “removed”).
- `submit_review`: booking `completed`, `author_id = auth.uid() = customer_id`, unique `booking_id`.
- Cannot review yourself (already blocked by no self-book).
- Hidden reviews excluded from `rating_*` recompute (admin hide is a trust control).

### 7.7 `notifications`

- SELECT/UPDATE `read_at`: `user_id = auth.uid()` only.
- No client INSERT (prevents fake “your job was accepted” spam).
- Payload: no address, no phone, no other users’ email.

## 8. Abuse cases and mitigations

| Abuse                                               | Mitigation                                                                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| IDOR: pass another booking UUID to `accept_booking` | RPC: `provider_id = auth.uid()`                                                                                   |
| Self-book to plant a 5-star review                  | `customer_id <> provider_id`; RPC rejects owner                                                                   |
| Client sends status `completed`                     | No UPDATE grant; RPC state machine                                                                                |
| Client sends `snapshot_price_amount = 1`            | Snapshot taken from listing in RPC                                                                                |
| Signup as admin via metadata                        | Trigger whitelist                                                                                                 |
| Direct insert `user_roles.admin`                    | RLS + revoke + trigger                                                                                            |
| Inflate `rating_avg`                                | Column not updatable except recompute function                                                                    |
| Review before job                                   | RPC requires `completed`                                                                                          |
| Duplicate review                                    | Unique `booking_id`                                                                                               |
| Complete a `requested` job                          | Invalid transition                                                                                                |
| Banned user still books                             | RPC checks `profiles.is_active`; disable Auth user                                                                |
| Spam `create_booking`                               | Later: DB rate limit or Edge; Auth limits for signup                                                              |
| Enumerate bookings                                  | No SELECT for non-parties; no sequential integer ids                                                              |
| Inactive listing still bookable                     | RPC checks listing/city/category/provider active                                                                  |
| Provider forges `provider_id` on listing            | WITH CHECK `provider_id = auth.uid()`                                                                             |
| Dual-role user books own listing                    | Same as self-book                                                                                                 |
| Admin RPC as normal user                            | `is_admin()` first line                                                                                           |
| Leak address on listing join                        | Never selected in public views                                                                                    |
| XSS in review `comment`                             | Stored as text; React default escape; no `dangerouslySetInnerHTML`; CSP in prod                                   |
| SVG upload XSS                                      | Storage: jpeg/png/webp only; no SVG                                                                               |
| Path overwrite another provider’s image             | Key prefix `{auth.uid()}/...` in Storage policy                                                                   |
| Service role in the SPA                             | Code review + env naming; never `VITE_SERVICE`                                                                    |
| CSRF against cookie session                         | If we switch to cookies: SameSite + CSRF; current JWT header from supabase-js is origin-bound with CORS allowlist |

## 9. Storage bucket `listing-covers`

- Authenticated **upload/update/delete** only when the first path segment is `auth.uid()::text`.
- Public **read** for objects (listing cards). Do not put private addresses in image EXIF if we can strip; not guaranteed in MVP—document as residual risk.
- Max size ~2 MB; MIME allow-list.
- `cover_image_path` on listings should match an object in this bucket, not an arbitrary `javascript:` or remote HTML URL (prevents using the listing card as an open redirect / script host). Prefer storing the storage path only and signing/public URL in the client via the SDK.

## 10. Hosted grants and policy verification checklist

Catalog status below was inspected read-only in the authenticated Dashboard SQL Editor on 2026-09-28. Catalog evidence does not replace authenticated behavior tests.

- [x] RLS is enabled on all nine application `public` tables; none has FORCE ROW LEVEL SECURITY enabled.
- [ ] Least-privilege table grants are not yet satisfied: `anon` and `authenticated` have table-level `INSERT`/`UPDATE`/`DELETE` privileges on `listings` and `user_roles`; RLS policies currently constrain or deny these writes. `anon` also has SELECT on `bookings` and on its `address_text` column; RLS has no anon booking policy.
- [x] Direct `INSERT`/`UPDATE`/`DELETE` on `bookings` and `reviews` is not granted to `anon` or `authenticated`.
- [x] `profiles_public` projects `id`, `display_name`, `bio`, `city_id`, and `is_verified` only; the projection contains no phone.
- [ ] Intended public/counterpart profile reads are not met by the hosted catalog: the view is `security_invoker=true`, and the only deployed `profiles` SELECT policy is self-or-admin. The customer phone lookup in `BookingDetailPage.tsx` likewise has no booking-party SELECT policy. Authenticated runtime verification remains blocked.
- [x] Booking RPCs are not executable by `anon`; no admin RPCs exist. The inspected booking/review/account/role RPCs are executable by `authenticated`.
- [x] Inspected `SECURITY DEFINER` functions are owned by `postgres` and have `search_path=public`; review public execution of helper functions as recorded above.
- [x] `listing-covers` exists with public access, JPEG/PNG/WebP MIME allow-list, 2 MiB size limit, and four owner-prefix/public-read policies. Cross-owner runtime tests remain blocked.
- [ ] Realtime publication membership: **Not Verified**; Realtime is not required for MVP.
- [ ] Current operator's LocalServe admin role: **Admin role: NOT VERIFIED**. One admin role assignment exists, but the SQL Editor identity is `postgres` and `auth.uid()` is NULL.

## 11. Logging and operations

- Log RPC failures: `auth.uid()`, function name, error code — not `address_text`, not tokens.
- Do not log full booking rows at `INFO`.
- Production: HTTPS only; Supabase CORS allowlist = Vercel prod + local dev origins.
- Backups contain PII; restrict who can restore. Seed data never uses real phones/addresses.
- Rotate admin password and regenerate keys if the anon key is accidentally treated as secret (anon is public by design; **service role** rotation is the emergency).

## 12. Security test execution checklist

Run these through Supabase SQL/API with the `anon` role and at least two separate authenticated accounts. A source-code guard or React route result is not a substitute for a database/API test. Do not check off a test until its expected result is recorded. Catalog checks were performed through the Dashboard on 2026-09-28, but no authenticated LocalServe application account was used for a behavior test. Preserve the two previously executed anonymous API probe results below.

| Test                                                                                       | Expected result                                               | Status / evidence                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Anonymous booking RPC (`create_booking`)                                                   | Rejected before any write                                     | **Executed:** anonymous REST RPC returned HTTP 401 using a deliberately nonexistent listing id; no booking was created.                                                                                            |
| Anonymous read of a known profile's `phone` column                                         | Denied; no phone returned                                     | **Executed for one public provider profile:** REST read returned HTTP 401. This does not verify every profile or the underlying policy definition.                                                                 |
| Anonymous `SELECT` from `bookings`                                                         | No booking rows or permission denied                          | **Not verified:** anonymous query returned HTTP 200 with zero rows, but no known booking row was queried; zero rows alone does not prove RLS. **Blocked — requires authenticated test account / hosted access.**   |
| Anonymous and authenticated read of another user's `profiles_public` row                   | Public fields are returned; `phone` is absent                 | **Catalog mismatch:** hosted view is `security_invoker=true` and deployed `profiles` SELECT policy is self/admin only. **Blocked — requires PostgREST/API behavior test; likely filtered for other users.**        |
| Customer reads provider phone after an accepted booking                                    | Provider phone is returned only to the booking customer       | **Catalog mismatch:** `BookingDetailPage.tsx` selects `profiles.phone`, but the hosted `profiles` policy permits only self/admin. **Blocked — requires authenticated booking fixture to confirm runtime outcome.** |
| User B reads User A's booking by UUID                                                      | No row is returned                                            | **Blocked — requires authenticated test account / hosted access.**                                                                                                                                                 |
| User B accepts or declines User A's booking                                                | RPC rejects; status remains unchanged                         | **Blocked — requires authenticated test account / hosted access.**                                                                                                                                                 |
| Illegal transitions: accept twice, complete a requested booking, cancel a terminal booking | Each RPC rejects; status remains unchanged                    | **Blocked — requires authenticated test account / hosted access.**                                                                                                                                                 |
| Customer directly updates `bookings.status`                                                | Permission denied; no state change                            | **Blocked — requires authenticated test account / hosted access.**                                                                                                                                                 |
| Customer directly inserts or updates a review                                              | Permission denied; no review change                           | **Blocked — requires authenticated test account / hosted access.**                                                                                                                                                 |
| Review submission before booking completion                                                | `submit_review` rejects; no review row                        | **Blocked — requires authenticated test account / hosted access.**                                                                                                                                                 |
| Duplicate review for one completed booking                                                 | Second `submit_review` rejects; only one row exists           | **Blocked — requires authenticated test account / hosted access.**                                                                                                                                                 |
| Customer directly inserts their own `user_roles.admin` row                                 | Permission denied; no admin role appears                      | **Blocked — requires authenticated test account / hosted access.**                                                                                                                                                 |
| Signup with `role=admin` metadata                                                          | Signup is rejected or receives only the default customer role | **Blocked — requires hosted access.** `supabase/tests/handle_new_user_fallback.sql` contains a rollback smoke test but has not been executed in this audit.                                                        |
| Provider B edits/deactivates Provider A's listing or forges its `provider_id`              | No row changes; operation is denied                           | **Blocked — requires authenticated test account / hosted access.**                                                                                                                                                 |
| Provider B uploads, updates, or deletes under Provider A's Storage prefix                  | Storage request is denied                                     | **Blocked — requires authenticated test account / hosted access.**                                                                                                                                                 |
| Non-admin invokes every admin operation                                                    | Authorization error and no data changes                       | **Pending:** admin RPCs are not implemented. After implementation: **Blocked — requires authenticated test account / hosted access.**                                                                              |
| Inactive customer/provider attempts marketplace RPCs                                       | RPC rejects; no write                                         | **Blocked — requires authenticated test account / hosted access.**                                                                                                                                                 |
| Owner attempts to book their own listing                                                   | `create_booking` rejects; no booking row                      | **Blocked — requires authenticated test account / hosted access.**                                                                                                                                                 |
| Unsafe or off-site login `next` parameter                                                  | Redirect remains same-origin or falls back safely             | **Not executed in this task; guest `/admin` redirect was observed but does not cover malicious `next` values.**                                                                                                    |

`supabase/tests/handle_new_user_fallback.sql` tests missing/invalid signup-area fallback and rejection of admin signup metadata by checking transaction-local rows and rolling the fixtures back. It is the only checked-in SQL test file; it is a manual smoke script, not an automated test runner. **Execution status: Blocked — requires hosted access or a configured local Supabase database.**

## 13. Residual risks (accepted for MVP)

- No hard rate limit on `create_booking` until abused.
- Provider can mark `completed` without customer confirmation (PRD).
- Double-booking allowed (PRD).
- UUIDs in notifications if a device is shared.
- Public review text may contain phone numbers (moderation, not schema).
- Hosted Supabase operator access (platform trust).

## 14. When this document must be revised

- Adding Stripe, chat, maps, or exposing a new view that joins `bookings` to listings.
- Enabling Supabase Realtime on `bookings`.
- Introducing a second provider user on one listing (staff accounts).
- Moving phone back onto a wide `SELECT * FROM profiles` policy.
