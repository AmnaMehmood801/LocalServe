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
import { buildAdminProfiles } from "../../lib/admin";
import { supabase } from "../../lib/supabase";

export function AdminUsersPage() {
  const query = useAdminData();
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  async function updateProfile(
    profileId: string,
    action: "active" | "verified",
    value: boolean,
  ) {
    const actionId = `${profileId}:${action}`;
    setPendingAction(actionId);
    try {
      const { error } =
        action === "active"
          ? await supabase.rpc("admin_set_profile_active", {
              profile_id: profileId,
              is_active: value,
            })
          : await supabase.rpc("admin_set_profile_verified", {
              profile_id: profileId,
              is_verified: value,
            });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
      toast.success(
        action === "active" ? "User status updated." : "Verification updated.",
      );
    } catch {
      toast.error(
        action === "active"
          ? "Could not update user status."
          : "Could not update verification.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <AdminDataBoundary query={query}>
      {(data) => {
        const profiles = buildAdminProfiles(data);

        return (
          <>
            <AdminPageHeader
              title="Users"
              description="Review LocalServe account roles, verification, and active status."
            />
            <AdminDataTable
              title="All users"
              description="Email addresses are not exposed in this browser panel."
              rows={profiles}
              getKey={(row) => row.id}
              getSearchText={(row) =>
                `${row.display_name} ${row.id} ${row.roles.join(" ")}`
              }
              emptyMessage="No users found."
              filters={[
                {
                  label: "Role",
                  value: roleFilter,
                  onChange: setRoleFilter,
                  valueForRow: (row) =>
                    row.roles.length ? row.roles : ["no-role"],
                  options: [
                    { label: "All roles", value: "all" },
                    { label: "Customer", value: "customer" },
                    { label: "Provider", value: "provider" },
                    { label: "Admin", value: "admin" },
                    { label: "No role", value: "no-role" },
                  ],
                },
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
                  header: "User",
                  render: (row) => (
                    <div className="flex min-w-48 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-50 font-semibold text-teal-700">
                        {(row.display_name || "U").slice(0, 1).toUpperCase()}
                      </span>
                      <span>
                        <span className="block font-medium text-ink">
                          {row.display_name}
                        </span>
                        <span className="font-mono text-xs text-slate-400">
                          {row.id.slice(0, 8)}
                        </span>
                      </span>
                    </div>
                  ),
                },
                {
                  header: "Role",
                  render: (row) =>
                    row.roles.length ? (
                      <span className="flex flex-wrap gap-1.5">
                        {row.roles.map((role) => (
                          <AdminStatusBadge
                            key={role}
                            tone={role === "admin" ? "info" : "neutral"}
                          >
                            {role}
                          </AdminStatusBadge>
                        ))}
                      </span>
                    ) : (
                      "—"
                    ),
                },
                {
                  header: "Verified",
                  render: (row) => (
                    <AdminStatusBadge
                      tone={row.is_verified ? "success" : "neutral"}
                    >
                      {row.is_verified ? "Verified" : "Not verified"}
                    </AdminStatusBadge>
                  ),
                },
                {
                  header: "Status",
                  render: (row) => (
                    <AdminStatusBadge
                      tone={row.is_active ? "success" : "danger"}
                    >
                      {row.is_active ? "Active" : "Inactive"}
                    </AdminStatusBadge>
                  ),
                },
                {
                  header: "Joined",
                  render: (row) => formatAdminDate(row.created_at),
                },
                {
                  header: "Actions",
                  render: (row) => (
                    <div className="flex min-w-36 flex-col gap-2">
                      <button
                        type="button"
                        disabled={pendingAction !== null}
                        onClick={() =>
                          void updateProfile(row.id, "active", !row.is_active)
                        }
                        className="min-h-9 rounded-lg border border-ink/20 px-3 text-xs font-medium hover:bg-cream-50 disabled:opacity-50"
                      >
                        {pendingAction === `${row.id}:active`
                          ? "Saving..."
                          : row.is_active
                            ? "Deactivate"
                            : "Reactivate"}
                      </button>
                      <button
                        type="button"
                        disabled={pendingAction !== null}
                        onClick={() =>
                          void updateProfile(
                            row.id,
                            "verified",
                            !row.is_verified,
                          )
                        }
                        className="min-h-9 rounded-lg border border-ink/20 px-3 text-xs font-medium hover:bg-cream-50 disabled:opacity-50"
                      >
                        {pendingAction === `${row.id}:verified`
                          ? "Saving..."
                          : row.is_verified
                            ? "Remove verification"
                            : "Mark verified"}
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          </>
        );
      }}
    </AdminDataBoundary>
  );
}
