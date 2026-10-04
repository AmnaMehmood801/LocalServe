import { AlertCircle, LoaderCircle } from "lucide-react";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink md:text-3xl">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-600 md:text-base">
        {description}
      </p>
    </div>
  );
}

export function AdminLoadingState({ label = "Loading admin data" }: { label?: string }) {
  return (
    <div
      className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border border-cream-100 bg-white text-sm text-slate-600 shadow-sm"
      role="status"
    >
      <LoaderCircle size={20} className="animate-spin text-teal-600" aria-hidden="true" />
      {label}…
    </div>
  );
}

export function AdminErrorState({ message }: { message: string }) {
  return (
    <div
      className="flex min-h-48 items-center gap-3 rounded-2xl border border-rose-600/20 bg-white p-6 text-sm text-rose-600 shadow-sm"
      role="alert"
    >
      <AlertCircle size={20} aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

export function AdminStatusBadge({
  children,
  tone = "neutral",
}: {
  children: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "bg-cream-100 text-slate-600",
    success: "bg-emerald-600/10 text-emerald-600",
    warning: "bg-amber-500/15 text-ink",
    danger: "bg-rose-600/10 text-rose-600",
    info: "bg-teal-50 text-teal-700",
  };

  return (
    <span className={`inline-flex min-h-6 items-center rounded-full px-2.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
