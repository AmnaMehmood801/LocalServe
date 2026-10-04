import { ShieldCheck } from "lucide-react";

export function AdminMigrationNotice() {
  return (
    <div
      className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-slate-700"
      role="status"
    >
      <ShieldCheck
        size={18}
        className="mt-0.5 shrink-0 text-amber-600"
        aria-hidden="true"
      />
      <p>
        Admin write actions require the new database migration to be deployed
        before they can be used.
      </p>
    </div>
  );
}
