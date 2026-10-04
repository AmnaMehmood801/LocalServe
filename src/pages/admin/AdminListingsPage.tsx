import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "../../lib/toast";

import { AdminDataTable } from "../../components/admin/AdminDataTable";
import { AdminDataBoundary } from "../../components/admin/AdminDataBoundary";
import {
  AdminPageHeader,
  AdminStatusBadge,
} from "../../components/admin/AdminPageState";
import {
  formatAdminDate,
  formatAdminMoney,
} from "../../components/admin/adminFormat";
import { useAdminData } from "../../components/admin/useAdminData";
import { buildAdminListings } from "../../lib/admin";
import { supabase } from "../../lib/supabase";

export function AdminListingsPage() {
  const query = useAdminData();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [pendingListingId, setPendingListingId] = useState<string | null>(null);

  async function toggleListing(listingId: string, isActive: boolean) {
    setPendingListingId(listingId);
    try {
      const { error } = await supabase.rpc("admin_set_listing_active", {
        listing_id: listingId,
        is_active: !isActive,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
      toast.success(isActive ? "Listing deactivated." : "Listing reactivated.");
    } catch {
      toast.error("Could not update listing status.");
    } finally {
      setPendingListingId(null);
    }
  }

  return (
    <AdminDataBoundary query={query}>
      {(data) => (
        <>
          <AdminPageHeader
            title="Listings"
            description="Review active and inactive services, provider ownership, pricing, and rating summaries."
          />
          <AdminDataTable
            title="All listings"
            rows={buildAdminListings(data)}
            getKey={(row) => row.id}
            getSearchText={(row) =>
              `${row.title} ${row.description} ${row.providerName} ${row.categoryName} ${row.id}`
            }
            emptyMessage="No listings found."
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
              {
                label: "Category",
                value: categoryFilter,
                onChange: setCategoryFilter,
                valueForRow: (row) => row.category_id,
                options: [
                  { label: "All categories", value: "all" },
                  ...data.categories.map((category) => ({
                    label: category.name,
                    value: category.id,
                  })),
                ],
              },
            ]}
            columns={[
              {
                header: "Service",
                render: (row) => (
                  <div className="flex min-w-52 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cream-50 font-semibold text-teal-700">
                      {row.title.slice(0, 1).toUpperCase()}
                    </span>
                    <span>
                      <span className="block font-medium text-ink">
                        {row.title}
                      </span>
                      <span className="block max-w-72 truncate text-xs text-slate-600">
                        {row.description}
                      </span>
                    </span>
                  </div>
                ),
              },
              { header: "Provider", render: (row) => row.providerName },
              { header: "Category", render: (row) => row.categoryName },
              {
                header: "Price",
                render: (row) =>
                  formatAdminMoney(row.price_amount, row.currency),
              },
              {
                header: "Rating",
                render: (row) =>
                  row.rating_count
                    ? `${row.rating_avg.toFixed(1)} (${row.rating_count})`
                    : "No reviews",
              },
              {
                header: "Status",
                render: (row) => (
                  <AdminStatusBadge
                    tone={row.is_active ? "success" : "neutral"}
                  >
                    {row.is_active ? "Active" : "Inactive"}
                  </AdminStatusBadge>
                ),
              },
              {
                header: "Created",
                render: (row) => formatAdminDate(row.created_at),
              },
              {
                header: "Actions",
                render: (row) => (
                  <button
                    type="button"
                    disabled={pendingListingId !== null}
                    onClick={() => void toggleListing(row.id, row.is_active)}
                    className="min-h-9 min-w-28 rounded-lg border border-ink/20 px-3 text-xs font-medium hover:bg-cream-50 disabled:opacity-50"
                  >
                    {pendingListingId === row.id
                      ? "Saving..."
                      : row.is_active
                        ? "Deactivate"
                        : "Reactivate"}
                  </button>
                ),
              },
            ]}
          />
        </>
      )}
    </AdminDataBoundary>
  );
}
