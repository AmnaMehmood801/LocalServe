# Product Requirements Document (PRD)

**Product:** LocalServe  
**Status:** Draft for MVP  
**Audience:** Engineering, product, design

## 1. Problem

People who need a tutor, electrician, cleaner, or repair person rely on informal networks, social posts, or generic directories. Those channels do not give:

- comparable offerings in one place (price, skills, area, reviews);
- a reliable way to **request a time** and get a yes/no from the provider;
- a history of work that other customers can trust.

Providers who are good at the craft are often bad at being found. They need a listing, inbound demand, and a simple inbox for requests.

## 2. Product in one sentence

A Samundri-area two-sided marketplace where **customers** discover trusted local providers (tutoring, electrician, cleaning, repair, and similar categories) and **providers** publish offerings and accept or decline booking requests. Samundri is in Faisalabad District; Faisalabad city is not the launch market.

## 3. Goals

1. Let a customer in Samundri find relevant providers in under two minutes by locality.
2. Let a customer submit a booking request with service, location, preferred time, and notes.
3. Let a provider accept, decline, or cancel without leaving the app.
4. After a job is marked complete, let the customer leave a rating and written review.
5. Give admins enough control to keep categories, cities, and listings trustworthy.

## 4. Non-goals (MVP)

- Instant “book now and pay” with calendar blocking across all providers.
- In-app chat or video.
- Escrow, marketplace payouts, invoices, or tax reporting.
- Mobile native apps (responsive web is enough).
- Background-check marketplace or insurance marketplace.
- Recurring subscriptions (e.g. weekly cleaning) as a first-class product.

These can be sequenced later; they must not block the request/review loop.

## 5. Roles

- **Customer** — searches, books, reviews after completion.
- **Provider** — onboards, lists services, responds to requests, completes jobs.
- **Admin** — moderates listings, reviews, and the city/category catalog.

Dual role on the same account is allowed in MVP (a user can be both customer and provider). A user cannot book their own listing.

## 6. Personas

### 6.1 Customer — “Ayesha, parent”

Needs a math tutor in her Samundri locality, wants to see rates and reviews, sends a request for Saturday 4–6pm, and wants to know if the tutor accepted.

**Jobs to be done:** discover, compare, request, show up, rate.

### 6.2 Customer — “Omar, homeowner”

Needs an electrician this week. Cares about city coverage, emergency vs scheduled, and not getting ghosted.

### 6.3 Provider — “Sana, independent tutor”

Lists subjects, hourly rate, areas she travels to. Checks requests daily. Declines if the time conflicts.

### 6.4 Provider — “Imran, electrician”

Lists job types (wiring, faults, installation), call-out vs hourly, service radius. Needs a clear pipeline: new / accepted / done.

### 6.5 Admin

Keeps spam and fake reviews out; maintains city and category catalogs.

## 7. User-facing capabilities

| Area     | Customer                           | Provider                                   | Admin              |
| -------- | ---------------------------------- | ------------------------------------------ | ------------------ |
| Identity | Sign up, profile, city             | Sign up, business profile                  | Manage users       |
| Catalog  | Browse categories, search, filter  | Create/update/deactivate services, pricing | Categories, cities |
| Booking  | Create request, cancel             | Accept / decline / complete                | Lookup / support   |
| Trust    | Read reviews, write after complete | Read reviews                               | Moderate           |
| Ops      | Booking history                    | Dashboard / request inbox                  | Reports (later)    |

Guests can browse listings. Signing in is required to book or review.

## 8. Booking product rules

1. A booking is always for **one service listing**, **one customer**, **one provider**.
2. Customer proposes a window (date + start time + optional end / duration + address) plus notes.
3. New bookings start as **requested**.
4. Provider **accepts** (locks the request) or **declines** (optional reason).
5. Customer may cancel a requested booking. Either party may cancel an accepted booking with a reason.
6. Only **accepted** bookings can move to **in progress** (optional) and **completed**.
7. **Completed** unlocks a customer review. One review per booking.
8. Double-booking is not hard-blocked in MVP (providers manage their own calendar).

## 9. Discovery product rules

- Default geo: user's selected **locality within Samundri** (not GPS radius in MVP). The app ships with Samundri fixed as the launch city; service is limited to Samundri city and nearby localities within about 5–10 km.
- Search: free text over service title, description, provider display name, category.
- Filters: category, min rating, price range, and the currently selected Samundri locality.
- All public listings, category pages, and search results are filtered to the current area selection.
- Sort: relevance (default), rating, price low/high, newest.
- Inactive listings do not appear in search.

## 10. Trust and quality

- Reviews require a completed booking.
- Rating is 1–5 stars plus optional text (minimum 10 characters if text is provided).
- Listing shows aggregate rating and review count.
- Admin can hide a review or deactivate a listing or user.

## 11. Success metrics (MVP)

| Metric                                   | Target (first 90 days after launch in one city) |
| ---------------------------------------- | ----------------------------------------------- |
| Time-to-first-request (new customer)     | < 10 minutes median                             |
| Provider response on new request         | < 24 hours for 80%                              |
| Request → accept rate                    | Track; no hard target until supply exists       |
| Completed jobs with customer review      | ≥ 40%                                           |
| Critical bugs in booking status handling | Zero known in production                        |

## 12. Constraints

- Launch with one metro first; data should still allow more cities later.
- Local-first / self-hosted friendly: one web app + one API + one database is acceptable.
- Pricing is set by the provider (hourly or fixed). Payments stay off-platform in MVP.
- PII (names, emails, phones, addresses) is sensitive: booking address is only for the two parties and admin.

## 13. Open decisions

| Topic                    | Default for MVP                                                  | Revisit when                       |
| ------------------------ | ---------------------------------------------------------------- | ---------------------------------- |
| Payments                 | Off; cash/outside app                                            | Demand for deposits                |
| Dual role (same account) | Allowed                                                          | Abuse patterns                     |
| Address granularity      | Full address on booking only                                     | Privacy complaints                 |
| Multi-language           | English UI                                                       | City expansion                     |
| Location granularity     | Fixed Samundri city + selected approved locality from a dropdown | More cities or wider area coverage |
| Provider verification    | Manual admin flag                                                | Scale                              |
| Phone sharing            | After accept                                                     | Privacy complaints                 |
