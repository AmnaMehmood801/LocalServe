import {
  BriefcaseBusiness,
  ClipboardList,
  MessageSquareText,
  Users,
} from "lucide-react";

import { AdminDataTable } from "../../components/admin/AdminDataTable";
import { AdminDataBoundary } from "../../components/admin/AdminDataBoundary";
import { AdminStatCard } from "../../components/admin/AdminStatCard";
import { AdminStatusBadge, AdminPageHeader } from "../../components/admin/AdminPageState";
import { bookingStatusLabel, bookingStatusTone, formatAdminDate } from "../../components/admin/adminFormat";
import { useAdminData } from "../../components/admin/useAdminData";
import {
  buildAdminBookings,
  buildAdminListings,
  buildAdminProfiles,
  buildAdminReviews,
} from "../../lib/admin";

export function AdminDashboardPage() {
  const query = useAdminData();

  return (
    <AdminDataBoundary query={query}>
      {(data) => {
        const profiles = buildAdminProfiles(data);
        const providers = profiles.filter((profile) => profile.roles.includes("provider"));
        const listings = buildAdminListings(data);
        const bookings = buildAdminBookings(data);
        const reviews = buildAdminReviews(data);
        const visibleReviews = reviews.filter((review) => !review.is_hidden);
        const pendingBookings = bookings.filter(
          (booking) => booking.status === "requested",
        ).length;
        const completedBookings = bookings.filter(
          (booking) => booking.status === "completed",
        ).length;
        const averageRating = visibleReviews.length
          ? visibleReviews.reduce((sum, review) => sum + review.rating, 0) /
            visibleReviews.length
          : null;
        const recentBookings = bookings.slice(0, 5);
        const recentProfiles = profiles.slice(0, 5);
        const recentListings = listings.slice(0, 5);
        const recentReviews = reviews.slice(0, 5);

        return (
          <>
            <AdminPageHeader
              eyebrow="Marketplace overview"
              title="Dashboard"
              description="A current snapshot of LocalServe activity. Counts reflect the records available under your admin access."
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <AdminStatCard
                label="Total users"
                value={data.totals.profiles}
                detail={`${profiles.filter((profile) => profile.is_active).length} active in loaded records`}
                icon={Users}
              />
              <AdminStatCard
                label="Providers"
                value={providers.length}
                detail="Accounts with the provider role"
                icon={BriefcaseBusiness}
              />
              <AdminStatCard
                label="Listings"
                value={data.totals.listings}
                detail={`${listings.filter((listing) => listing.is_active).length} active in loaded records`}
                icon={ClipboardList}
              />
              <AdminStatCard
                label="Bookings"
                value={data.totals.bookings}
                detail={`${bookings.filter((booking) => booking.status === "requested").length} requested`}
                icon={MessageSquareText}
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <AdminStatCard
                label="Pending bookings"
                value={pendingBookings}
                detail={
                  data.totals.bookings === 0
                    ? "No booking requests yet"
                    : "Currently requested"
                }
                icon={MessageSquareText}
              />
              <AdminStatCard
                label="Completed bookings"
                value={completedBookings}
                detail="Marked complete"
                icon={ClipboardList}
              />
              <AdminStatCard
                label="Active listings"
                value={listings.filter((listing) => listing.is_active).length}
                detail="Current active services"
                icon={ClipboardList}
              />
              <AdminStatCard
                label="Average rating"
                value={averageRating === null ? "—" : averageRating.toFixed(1)}
                detail={
                  averageRating === null
                    ? "No visible reviews yet"
                    : `From ${visibleReviews.length} visible reviews`
                }
                icon={MessageSquareText}
              />
            </div>
            <div className="mt-8 grid gap-6">
              <AdminDataTable
                title="Recent bookings"
                rows={recentBookings}
                getKey={(row) => row.id}
                getSearchText={(row) =>
                  `${row.id} ${row.customerName} ${row.providerName} ${row.snapshot_title}`
                }
                emptyMessage="No bookings found."
                columns={[
                  {
                    header: "Booking",
                    render: (row) => (
                      <span className="font-mono text-xs text-slate-600">
                        {row.id.slice(0, 8)}
                      </span>
                    ),
                  },
                  { header: "Customer", render: (row) => row.customerName },
                  { header: "Provider", render: (row) => row.providerName },
                  { header: "Service", render: (row) => row.snapshot_title },
                  {
                    header: "Status",
                    render: (row) => (
                      <AdminStatusBadge tone={bookingStatusTone(row.status)}>
                        {bookingStatusLabel(row.status)}
                      </AdminStatusBadge>
                    ),
                  },
                  { header: "Created", render: (row) => formatAdminDate(row.created_at) },
                ]}
              />
              <div className="grid gap-6 xl:grid-cols-2">
                <AdminDataTable
                  title="Recent users"
                  rows={recentProfiles}
                  getKey={(row) => row.id}
                  getSearchText={(row) => `${row.display_name} ${row.roles.join(" ")}`}
                  emptyMessage="No users found."
                  columns={[
                    {
                      header: "User",
                      render: (row) => (
                        <span className="font-medium text-ink">{row.display_name}</span>
                      ),
                    },
                    { header: "Role", render: (row) => row.roles.join(", ") || "No role" },
                    {
                      header: "Status",
                      render: (row) => (
                        <AdminStatusBadge tone={row.is_active ? "success" : "danger"}>
                          {row.is_active ? "Active" : "Inactive"}
                        </AdminStatusBadge>
                      ),
                    },
                    { header: "Joined", render: (row) => formatAdminDate(row.created_at) },
                  ]}
                />
                <AdminDataTable
                  title="Recent listings"
                  rows={recentListings}
                  getKey={(row) => row.id}
                  getSearchText={(row) => `${row.title} ${row.providerName} ${row.categoryName}`}
                  emptyMessage="No listings found."
                  columns={[
                    { header: "Service", render: (row) => row.title },
                    { header: "Provider", render: (row) => row.providerName },
                    { header: "Category", render: (row) => row.categoryName },
                    {
                      header: "Status",
                      render: (row) => (
                        <AdminStatusBadge tone={row.is_active ? "success" : "neutral"}>
                          {row.is_active ? "Active" : "Inactive"}
                        </AdminStatusBadge>
                      ),
                    },
                  ]}
                />
              </div>
              <AdminDataTable
                title="Recent reviews"
                rows={recentReviews}
                getKey={(row) => row.id}
                getSearchText={(row) =>
                  `${row.authorName} ${row.providerName} ${row.listingTitle} ${row.comment ?? ""}`
                }
                emptyMessage="No reviews found."
                columns={[
                  { header: "Reviewer", render: (row) => row.authorName },
                  { header: "Service", render: (row) => row.listingTitle },
                  { header: "Provider", render: (row) => row.providerName },
                  { header: "Rating", render: (row) => `${row.rating} / 5` },
                  {
                    header: "Visibility",
                    render: (row) => (
                      <AdminStatusBadge tone={row.is_hidden ? "neutral" : "success"}>
                        {row.is_hidden ? "Hidden" : "Visible"}
                      </AdminStatusBadge>
                    ),
                  },
                  { header: "Date", render: (row) => formatAdminDate(row.created_at) },
                ]}
              />
            </div>
          </>
        );
      }}
    </AdminDataBoundary>
  );
}
