import type { Database } from "./database.types";
import { supabase } from "./supabase";

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "display_name" | "is_active" | "is_verified" | "created_at"
>;
type RoleRow = Pick<
  Database["public"]["Tables"]["user_roles"]["Row"],
  "user_id" | "role"
>;
type CityRow = Pick<
  Database["public"]["Tables"]["cities"]["Row"],
  "id" | "name" | "slug" | "is_active" | "created_at"
>;
type AreaRow = Pick<
  Database["public"]["Tables"]["areas"]["Row"],
  "id" | "name" | "city_id" | "is_active"
>;
type CategoryRow = Pick<
  Database["public"]["Tables"]["categories"]["Row"],
  "id" | "name" | "slug" | "is_active" | "sort_order" | "created_at"
>;
type ListingRow = Pick<
  Database["public"]["Tables"]["listings"]["Row"],
  | "id"
  | "provider_id"
  | "category_id"
  | "city_id"
  | "title"
  | "description"
  | "price_amount"
  | "currency"
  | "rating_avg"
  | "rating_count"
  | "is_active"
  | "created_at"
>;
type BookingRow = Pick<
  Database["public"]["Tables"]["bookings"]["Row"],
  | "id"
  | "customer_id"
  | "provider_id"
  | "listing_id"
  | "snapshot_title"
  | "status"
  | "snapshot_price_amount"
  | "snapshot_currency"
  | "scheduled_start"
  | "created_at"
>;
type ReviewRow = Pick<
  Database["public"]["Tables"]["reviews"]["Row"],
  | "id"
  | "author_id"
  | "target_provider_id"
  | "listing_id"
  | "rating"
  | "comment"
  | "is_hidden"
  | "created_at"
>;

export type AdminData = {
  profiles: ProfileRow[];
  roles: RoleRow[];
  cities: CityRow[];
  areas: AreaRow[];
  categories: CategoryRow[];
  listings: ListingRow[];
  bookings: BookingRow[];
  reviews: ReviewRow[];
  totals: {
    profiles: number;
    cities: number;
    categories: number;
    listings: number;
    bookings: number;
    reviews: number;
  };
};

export type AdminProfile = ProfileRow & {
  roles: Database["public"]["Enums"]["user_role"][];
};
export type AdminListing = ListingRow & {
  providerName: string;
  categoryName: string;
};
export type AdminBooking = BookingRow & {
  customerName: string;
  providerName: string;
};
export type AdminReview = ReviewRow & {
  authorName: string;
  providerName: string;
  listingTitle: string;
};

const ADMIN_PAGE_SIZE = 1000;

async function readAllRows<T>(
  tableName: string,
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += ADMIN_PAGE_SIZE) {
    const { data, error } = await fetchPage(
      from,
      from + ADMIN_PAGE_SIZE - 1,
    );
    if (error) {
      console.error(`Admin ${tableName} query failed.`, error);
      throw new Error(`Unable to load admin ${tableName}. Please try again.`);
    }

    const page = data ?? [];
    rows.push(...page);
    if (page.length < ADMIN_PAGE_SIZE) return rows;
  }
}

export async function fetchAdminData(): Promise<AdminData> {
  const [profiles, roles, cities, areas, categories, listings, bookings, reviews] =
    await Promise.all([
      readAllRows<ProfileRow>("profiles", (from, to) =>
        supabase
          .from("profiles")
          .select("id, display_name, is_active, is_verified, created_at")
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to),
      ),
      readAllRows<RoleRow>("roles", (from, to) =>
        supabase
          .from("user_roles")
          .select("user_id, role")
          .order("user_id")
          .order("role")
          .range(from, to),
      ),
      readAllRows<CityRow>("cities", (from, to) =>
        supabase
          .from("cities")
          .select("id, name, slug, is_active, created_at")
          .order("name")
          .order("id")
          .range(from, to),
      ),
      readAllRows<AreaRow>("areas", (from, to) =>
        supabase
          .from("areas")
          .select("id, name, city_id, is_active")
          .order("name")
          .order("id")
          .range(from, to),
      ),
      readAllRows<CategoryRow>("categories", (from, to) =>
        supabase
          .from("categories")
          .select("id, name, slug, is_active, sort_order, created_at")
          .order("sort_order")
          .order("name")
          .order("id")
          .range(from, to),
      ),
      readAllRows<ListingRow>("listings", (from, to) =>
        supabase
          .from("listings")
          .select(
            "id, provider_id, category_id, city_id, title, description, price_amount, currency, rating_avg, rating_count, is_active, created_at",
          )
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to),
      ),
      readAllRows<BookingRow>("bookings", (from, to) =>
        supabase
          .from("bookings")
          .select(
            "id, customer_id, provider_id, listing_id, snapshot_title, status, snapshot_price_amount, snapshot_currency, scheduled_start, created_at",
          )
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to),
      ),
      readAllRows<ReviewRow>("reviews", (from, to) =>
        supabase
          .from("reviews")
          .select(
            "id, author_id, target_provider_id, listing_id, rating, comment, is_hidden, created_at",
          )
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to),
      ),
    ]);

  return {
    profiles,
    roles,
    cities,
    areas,
    categories,
    listings,
    bookings,
    reviews,
    totals: {
      profiles: profiles.length,
      cities: cities.length,
      categories: categories.length,
      listings: listings.length,
      bookings: bookings.length,
      reviews: reviews.length,
    },
  };
}

export function buildAdminProfiles(data: AdminData): AdminProfile[] {
  const rolesByUser = new Map<string, AdminProfile["roles"]>();
  for (const role of data.roles) {
    const userRoles = rolesByUser.get(role.user_id) ?? [];
    userRoles.push(role.role);
    rolesByUser.set(role.user_id, userRoles);
  }

  return data.profiles.map((profile) => ({
    ...profile,
    roles: rolesByUser.get(profile.id) ?? [],
  }));
}

export function buildAdminListings(data: AdminData): AdminListing[] {
  const providers = new Map(
    data.profiles.map((profile) => [profile.id, profile.display_name]),
  );
  const categories = new Map(
    data.categories.map((category) => [category.id, category.name]),
  );

  return data.listings.map((listing) => ({
    ...listing,
    providerName: providers.get(listing.provider_id) ?? "Unavailable",
    categoryName: categories.get(listing.category_id) ?? "Uncategorized",
  }));
}

export function buildAdminBookings(data: AdminData): AdminBooking[] {
  const profiles = new Map(
    data.profiles.map((profile) => [profile.id, profile.display_name]),
  );
  return data.bookings.map((booking) => ({
    ...booking,
    customerName: profiles.get(booking.customer_id) ?? "Unavailable",
    providerName: profiles.get(booking.provider_id) ?? "Unavailable",
  }));
}

export function buildAdminReviews(data: AdminData): AdminReview[] {
  const profiles = new Map(
    data.profiles.map((profile) => [profile.id, profile.display_name]),
  );
  const listings = new Map(
    data.listings.map((listing) => [listing.id, listing.title]),
  );
  return data.reviews.map((review) => ({
    ...review,
    authorName: profiles.get(review.author_id) ?? "Unavailable",
    providerName: profiles.get(review.target_provider_id) ?? "Unavailable",
    listingTitle: listings.get(review.listing_id) ?? "Unavailable",
  }));
}
