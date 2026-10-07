import { useAuth } from "../../app/AuthContext";
import { AdminPageHeader } from "../../components/admin/AdminPageState";

export function AdminSettingsPage() {
  const { user, profile, displayName, roles } = useAuth();

  return (
    <>
      <AdminPageHeader
        title="Admin settings"
        description="View your LocalServe account details and application information."
      />
      <section className="max-w-3xl rounded-2xl border border-cream-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Admin profile</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-slate-600">Display name</dt>
            <dd className="mt-1 text-sm text-ink">
              {displayName ?? profile?.display_name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-600">Email</dt>
            <dd className="mt-1 break-all text-sm text-ink">
              {user?.email ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-600">Role</dt>
            <dd className="mt-1 text-sm capitalize text-ink">
              {roles.includes("admin") ? "Admin" : "Not verified"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-600">Product</dt>
            <dd className="mt-1 text-sm text-ink">LocalServe</dd>
          </div>
        </dl>
        <p className="mt-6 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
          Profile and system settings are view-only here. No account or security
          settings can be changed from this page.
        </p>
      </section>
    </>
  );
}
