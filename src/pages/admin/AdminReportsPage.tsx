import { AdminDataTable } from "../../components/admin/AdminDataTable";
import { AdminDataBoundary } from "../../components/admin/AdminDataBoundary";
import { AdminPageHeader, AdminStatusBadge } from "../../components/admin/AdminPageState";
import { AdminStatCard } from "../../components/admin/AdminStatCard";
import { bookingStatusLabel, bookingStatusTone } from "../../components/admin/adminFormat";
import { useAdminData } from "../../components/admin/useAdminData";
import { buildAdminProfiles } from "../../lib/admin";
import { BarChart3, BriefcaseBusiness, ClipboardList, MessageSquareText, Users } from "lucide-react";

export function AdminReportsPage() {
  const query = useAdminData();

  return (
    <AdminDataBoundary query={query}>
      {(data) => {
        const profiles = buildAdminProfiles(data);
        const providers = profiles.filter((profile) => profile.roles.includes("provider"));
        const visibleReviews = data.reviews.filter((review) => !review.is_hidden);
        const averageRating = visibleReviews.length
          ? visibleReviews.reduce((total, review) => total + review.rating, 0) /
            visibleReviews.length
          : null;
        const bookingStatuses = [
          "requested",
          "accepted",
          "declined",
          "in_progress",
          "completed",
          "cancelled_by_customer",
          "cancelled_by_provider",
        ] as const;
        const statusRows = bookingStatuses.map((status) => ({
          status,
          count: data.bookings.filter((booking) => booking.status === status).length,
        }));
        const categories = data.categories.map((category) => ({
          ...category,
          listingCount: data.listings.filter(
            (listing) => listing.category_id === category.id,
          ).length,
          activeListingCount: data.listings.filter(
            (listing) => listing.category_id === category.id && listing.is_active,
          ).length,
        }));

        return (
          <>
            <AdminPageHeader
              title="Reports"
              description="Current marketplace totals and status breakdowns calculated from available database records. No historical trends or revenue are inferred."
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <AdminStatCard label="Users" value={data.totals.profiles} detail="Current profiles" icon={Users} />
              <AdminStatCard label="Providers" value={providers.length} detail="Profiles with provider role" icon={BriefcaseBusiness} />
              <AdminStatCard label="Listings" value={data.totals.listings} detail="All visible to admin" icon={ClipboardList} />
              <AdminStatCard label="Bookings" value={data.totals.bookings} detail="All booking states" icon={BarChart3} />
              <AdminStatCard label="Visible reviews" value={visibleReviews.length} detail="Reviews not hidden" icon={MessageSquareText} />
              <AdminStatCard
                label="Average rating"
                value={averageRating === null ? "—" : averageRating.toFixed(1)}
                detail={averageRating === null ? "No visible reviews" : "Out of 5"}
                icon={MessageSquareText}
              />
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <AdminDataTable
                title="Booking status"
                rows={statusRows}
                getKey={(row) => row.status}
                getSearchText={(row) => bookingStatusLabel(row.status)}
                emptyMessage="No booking statuses found."
                columns={[
                  {
                    header: "Status",
                    render: (row) => (
                      <AdminStatusBadge tone={bookingStatusTone(row.status)}>
                        {bookingStatusLabel(row.status)}
                      </AdminStatusBadge>
                    ),
                  },
                  { header: "Bookings", render: (row) => row.count },
                ]}
              />
              <AdminDataTable
                title="Category activity"
                rows={categories}
                getKey={(row) => row.id}
                getSearchText={(row) => `${row.name} ${row.slug}`}
                emptyMessage="No categories found."
                columns={[
                  { header: "Category", render: (row) => row.name },
                  { header: "Listings", render: (row) => row.listingCount },
                  { header: "Active", render: (row) => row.activeListingCount },
                ]}
              />
            </div>
          </>
        );
      }}
    </AdminDataBoundary>
  );
}
