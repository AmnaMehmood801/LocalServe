import type { Database } from "../../lib/database.types";

export function formatAdminDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-PK", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

export function formatAdminMoney(amount: number, currency = "PKR") {
  const formatted = new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${currency === "PKR" ? "Rs." : currency} ${formatted}`;
}

export function bookingStatusLabel(status: Database["public"]["Enums"]["booking_status"]) {
  const labels: Record<Database["public"]["Enums"]["booking_status"], string> = {
    requested: "Requested",
    accepted: "Accepted",
    declined: "Declined",
    in_progress: "In progress",
    completed: "Completed",
    cancelled_by_customer: "Cancelled by customer",
    cancelled_by_provider: "Cancelled by provider",
  };
  return labels[status];
}

export function bookingStatusTone(
  status: Database["public"]["Enums"]["booking_status"],
): "neutral" | "success" | "warning" | "danger" | "info" {
  if (status === "requested") return "warning";
  if (status === "accepted" || status === "completed") return "success";
  if (status.startsWith("cancelled") || status === "declined") return "neutral";
  return "info";
}
