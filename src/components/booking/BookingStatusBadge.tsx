import {
  getBookingStatusLabel,
  type BookingStatus,
  type BookingViewer,
} from "../../lib/booking";

type Props = {
  status: BookingStatus;
  viewer: BookingViewer;
};

const statusStyles: Record<BookingStatus, string> = {
  requested: "border-amber-500/30 bg-amber-500/10 text-amber-800",
  accepted: "border-teal-600/25 bg-teal-50 text-teal-700",
  in_progress: "border-teal-600/25 bg-teal-50 text-teal-700",
  declined: "border-slate-400/40 bg-slate-400/10 text-slate-600",
  completed: "border-emerald-600/25 bg-emerald-600/10 text-emerald-700",
  cancelled_by_customer: "border-slate-400/40 bg-slate-400/10 text-slate-600",
  cancelled_by_provider: "border-slate-400/40 bg-slate-400/10 text-slate-600",
};

export function BookingStatusBadge({ status, viewer }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}
    >
      {getBookingStatusLabel(status, viewer)}
    </span>
  );
}
