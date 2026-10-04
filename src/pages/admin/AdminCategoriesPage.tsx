import { useState } from "react";

import { AdminDataTable } from "../../components/admin/AdminDataTable";
import { AdminDataBoundary } from "../../components/admin/AdminDataBoundary";
import { AdminPageHeader, AdminStatusBadge } from "../../components/admin/AdminPageState";
import { formatAdminDate } from "../../components/admin/adminFormat";
import { useAdminData } from "../../components/admin/useAdminData";

export function AdminCategoriesPage() {
  const query = useAdminData();
  const [statusFilter, setStatusFilter] = useState("all");

  return (
    <AdminDataBoundary query={query}>
      {(data) => {
        const rows = data.categories.map((category) => ({
          ...category,
          listingCount: data.listings.filter(
            (listing) => listing.category_id === category.id,
          ).length,
        }));

        return (
          <>
            <AdminPageHeader
              title="Categories"
              description="Review catalog categories and the number of listings currently assigned to each."
            />
            <AdminDataTable
              title="Category catalog"
              rows={rows}
              getKey={(row) => row.id}
              getSearchText={(row) => `${row.name} ${row.slug}`}
              emptyMessage="No categories found."
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
                { header: "Category", render: (row) => row.name },
                { header: "Slug", render: (row) => row.slug },
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
