import {
  getBookingStatusLabel,
  type BookingStatus,
  type BookingViewer,
} from "../../lib/booking";
import { useTranslation } from "react-i18next";

type Props = {
  status: BookingStatus;
  viewer: BookingViewer;
};

const statusStyles: Record<BookingStatus, { badge: string; dot: string }> = {
  requested: { badge: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  accepted: {
    badge: "bg-[#E3F7EC] text-[#168A55]",
    dot: "bg-[#1DBF73]",
  },
  in_progress: { badge: "bg-slate-100 text-slate-700", dot: "bg-slate-500" },
  declined: { badge: "bg-red-50 text-red-700", dot: "bg-red-500" },
  completed: { badge: "bg-[#1DBF73] text-white", dot: "bg-white" },
  cancelled_by_customer: {
    badge: "bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
  cancelled_by_provider: {
    badge: "bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
};

export function BookingStatusBadge({ status, viewer }: Props) {
  const { t } = useTranslation();
  const styles = statusStyles[status];

  return (
    <span
      className={`booking-status-badge inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styles.badge}`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${styles.dot}`}
      />
      {getBookingStatusLabel(status, viewer, t)}
    </span>
  );
}
