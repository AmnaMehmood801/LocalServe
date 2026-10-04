import { useState } from "react";

import { AdminDataTable } from "../../components/admin/AdminDataTable";
import { AdminDataBoundary } from "../../components/admin/AdminDataBoundary";
import { AdminPageHeader, AdminStatusBadge } from "../../components/admin/AdminPageState";
import { formatAdminDate } from "../../components/admin/adminFormat";
import { useAdminData } from "../../components/admin/useAdminData";
import { buildAdminListings, buildAdminProfiles } from "../../lib/admin";

export function AdminProvidersPage() {
  const query = useAdminData();
  const [statusFilter, setStatusFilter] = useState("all");

  return (
    <AdminDataBoundary query={query}>
      {(data) => {
        const providers = buildAdminProfiles(data).filter((profile) =>
          profile.roles.includes("provider"),
        );
        const listings = buildAdminListings(data);
        const rows = providers.map((provider) => {
          const providerListings = listings.filter(
            (listing) => listing.provider_id === provider.id,
          );
          const ratingCount = providerListings.reduce(
            (total, listing) => total + listing.rating_count,
            0,
          );
          const rating = ratingCount
            ? providerListings.reduce(
                (total, listing) => total + listing.rating_avg * listing.rating_count,
                0,
              ) / ratingCount
            : null;
          return {
            ...provider,
            listingCount: providerListings.length,
            bookingCount: data.bookings.filter(
              (booking) => booking.provider_id === provider.id,
            ).length,
            rating,
            ratingCount,
          };
        });

        return (
          <>
            <AdminPageHeader
              title="Providers"
              description="Understand provider activity from listings, bookings, and their current verification status."
            />
            <AdminDataTable
              title="Provider accounts"
              rows={rows}
              getKey={(row) => row.id}
              getSearchText={(row) => `${row.display_name} ${row.id}`}
              emptyMessage="No providers found."
              filters={[
                {
                  label: "Status",
                  value: statusFilter,
                  onChange: setStatusFilter,
                  valueForRow: (row) => (row.is_active ? "active" : "inactive"),
                  options: [
                    { label: "All statuses", value: "all" },
                    { label: "Active", value: "active" },
                    { label: "Inactive", value: "inactive" },
                  ],
                },
              ]}
              columns={[
                {
                  header: "Provider",
                  render: (row) => (
                    <div>
                      <p className="font-medium text-ink">{row.display_name}</p>
                      <p className="font-mono text-xs text-slate-400">{row.id.slice(0, 8)}</p>
                    </div>
                  ),
                },
                { header: "Listings", render: (row) => row.listingCount },
                { header: "Bookings", render: (row) => row.bookingCount },
                {
                  header: "Average rating",
                  render: (row) =>
                    row.rating === null
                      ? "No reviews"
                      : `${row.rating.toFixed(1)} (${row.ratingCount})`,
                },
                {
                  header: "Verified",
                  render: (row) => (
                    <AdminStatusBadge tone={row.is_verified ? "success" : "neutral"}>
                      {row.is_verified ? "Verified" : "Not verified"}
                    </AdminStatusBadge>
                  ),
                },
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
          </>
        );
      }}
    </AdminDataBoundary>
  );
}
