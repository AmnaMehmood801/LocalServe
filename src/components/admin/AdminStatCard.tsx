import type { LucideIcon } from "lucide-react";

export function AdminStatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <article className="rounded-2xl border border-cream-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">
            {value}
          </p>
        </div>
        <span className="grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-700">
          <Icon size={21} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-600">{detail}</p>
    </article>
  );
}
