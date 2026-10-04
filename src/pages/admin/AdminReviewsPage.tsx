import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "../../lib/toast";

import { AdminDataTable } from "../../components/admin/AdminDataTable";
import { AdminDataBoundary } from "../../components/admin/AdminDataBoundary";
import {
  AdminPageHeader,
  AdminStatusBadge,
} from "../../components/admin/AdminPageState";
import { formatAdminDate } from "../../components/admin/adminFormat";
import { useAdminData } from "../../components/admin/useAdminData";
import { buildAdminReviews } from "../../lib/admin";
import { supabase } from "../../lib/supabase";

export function AdminReviewsPage() {
  const query = useAdminData();
  const queryClient = useQueryClient();
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [pendingReviewId, setPendingReviewId] = useState<string | null>(null);

  async function toggleReview(reviewId: string, isHidden: boolean) {
    setPendingReviewId(reviewId);
    try {
      const { error } = await supabase.rpc("admin_set_review_visible", {
        review_id: reviewId,
        is_visible: isHidden,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
      toast.success(isHidden ? "Review restored." : "Review hidden.");
    } catch {
      toast.error("Could not update review visibility.");
    } finally {
      setPendingReviewId(null);
    }
  }

  return (
    <AdminDataBoundary query={query}>
      {(data) => (
        <>
          <AdminPageHeader
            title="Reviews"
            description="Monitor customer ratings and moderate review visibility."
          />
          <AdminDataTable
            title="Review records"
            rows={buildAdminReviews(data)}
            getKey={(row) => row.id}
            getSearchText={(row) =>
              `${row.authorName} ${row.providerName} ${row.listingTitle} ${row.comment ?? ""} ${row.rating}`
            }
            emptyMessage="No reviews found."
            filters={[
              {
                label: "Visibility",
                value: visibilityFilter,
                onChange: setVisibilityFilter,
                valueForRow: (row) => (row.is_hidden ? "hidden" : "visible"),
                options: [
                  { label: "All reviews", value: "all" },
                  { label: "Visible", value: "visible" },
                  { label: "Hidden", value: "hidden" },
                ],
              },
            ]}
            columns={[
              { header: "Reviewer", render: (row) => row.authorName },
              { header: "Service", render: (row) => row.listingTitle },
              { header: "Provider", render: (row) => row.providerName },
              { header: "Rating", render: (row) => `${row.rating} / 5` },
              {
                header: "Review",
                render: (row) => (
                  <p className="max-w-sm whitespace-normal text-slate-600">
                    {row.comment || "No written comment"}
                  </p>
                ),
              },
              {
                header: "Visibility",
                render: (row) => (
                  <AdminStatusBadge
                    tone={row.is_hidden ? "neutral" : "success"}
                  >
                    {row.is_hidden ? "Hidden" : "Visible"}
                  </AdminStatusBadge>
                ),
              },
              {
                header: "Date",
                render: (row) => formatAdminDate(row.created_at),
              },
              {
                header: "Actions",
                render: (row) => (
                  <button
                    type="button"
                    disabled={pendingReviewId !== null}
                    onClick={() => void toggleReview(row.id, row.is_hidden)}
                    className="min-h-9 min-w-28 rounded-lg border border-ink/20 px-3 text-xs font-medium hover:bg-cream-50 disabled:opacity-50"
                  >
                    {pendingReviewId === row.id
                      ? "Saving..."
                      : row.is_hidden
                        ? "Restore review"
                        : "Hide review"}
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
