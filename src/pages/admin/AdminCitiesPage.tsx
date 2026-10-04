import { useState } from "react";

import { AdminDataTable } from "../../components/admin/AdminDataTable";
import { AdminDataBoundary } from "../../components/admin/AdminDataBoundary";
import { AdminPageHeader, AdminStatusBadge } from "../../components/admin/AdminPageState";
import { formatAdminDate } from "../../components/admin/adminFormat";
import { useAdminData } from "../../components/admin/useAdminData";

export function AdminCitiesPage() {
  const query = useAdminData();
  const [statusFilter, setStatusFilter] = useState("all");

  return (
    <AdminDataBoundary query={query}>
      {(data) => {
        const rows = data.cities.map((city) => ({
          ...city,
          areas: data.areas.filter((area) => area.city_id === city.id),
          listingCount: data.listings.filter((listing) => listing.city_id === city.id).length,
        }));

        return (
          <>
            <AdminPageHeader
              title="Cities"
              description="Review the active service cities and their Samundri localities."
            />
            <AdminDataTable
              title="City catalog"
              rows={rows}
              getKey={(row) => row.id}
              getSearchText={(row) =>
                `${row.name} ${row.slug} ${row.areas.map((area) => area.name).join(" ")}`
              }
              emptyMessage="No cities found."
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
                  header: "City",
                  render: (row) => (
                    <div>
                      <p className="font-medium text-ink">{row.name}</p>
                      <p className="text-xs text-slate-600">{row.slug}</p>
                    </div>
                  ),
                },
                {
                  header: "Localities",
                  render: (row) =>
                    row.areas.length
                      ? row.areas.map((area) => area.name).join(", ")
                      : "No localities",
                },
                { header: "Listings", render: (row) => row.listingCount },
                {
                  header: "Status",
                  render: (row) => (
                    <AdminStatusBadge tone={row.is_active ? "success" : "neutral"}>
                      {row.is_active ? "Active" : "Inactive"}
                    </AdminStatusBadge>
                  ),
                },
                { header: "Created", render: (row) => formatAdminDate(row.created_at) },
              ]}
            />
          </>
        );
      }}
    </AdminDataBoundary>
  );
}
