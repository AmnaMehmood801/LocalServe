import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth } from "date-fns";
import { CalendarClock, CheckCircle2, Inbox } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "../lib/toast";

import { useAuth } from "../app/AuthContext";
import { BookingStatusBadge } from "../components/booking/BookingStatusBadge";
import {
  formatBookingPrice,
  getBookingErrorMessage,
  type BookingStatus,
} from "../lib/booking";
import type { Database } from "../lib/database.types";
import { supabase } from "../lib/supabase";

type InboxFilter = "new" | "upcoming" | "done" | "closed";

type ProviderBooking = {
  id: string;
  customer_id: string;
  status: BookingStatus;
  scheduled_start: string;
  scheduled_end: string | null;
  completed_at: string | null;
  address_text: string;
  notes: string | null;
  snapshot_title: string;
  snapshot_price_amount: number;
  snapshot_currency: string;
  decline_reason: string | null;
  cancel_reason: string | null;
  customer_name: string;
};

const filterOptions: { key: InboxFilter; labelKey: string }[] = [
  { key: "new", labelKey: "provider.requests.filters.new" },
  { key: "upcoming", labelKey: "provider.requests.filters.upcoming" },
  { key: "done", labelKey: "provider.requests.filters.done" },
  { key: "closed", labelKey: "provider.requests.filters.closed" },
];

function matchesFilter(status: BookingStatus, filter: InboxFilter) {
  if (filter === "new") return status === "requested";
  if (filter === "upcoming")
    return status === "accepted" || status === "in_progress";
  if (filter === "done") return status === "completed";
  return (
    status === "declined" ||
    status === "cancelled_by_customer" ||
    status === "cancelled_by_provider"
  );
}

function ProviderBookingCard({ booking }: { booking: ProviderBooking }) {
  const { t } = useTranslation();
  const customerName =
    booking.customer_name === "LocalServe member"
      ? t("provider.requests.memberFallback")
      : booking.customer_name;
  const queryClient = useQueryClient();
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function runAction(
    action: "accept" | "decline" | "complete" | "cancel",
  ) {
    setActionError(null);
    setBusy(true);
    let error: { code?: string; message?: string } | null = null;
    if (action === "accept") {
      ({ error } = await supabase.rpc("accept_booking", {
        p_booking_id: booking.id,
      }));
    } else if (action === "decline") {
      ({ error } = await supabase.rpc("decline_booking", {
        p_booking_id: booking.id,
        p_reason: reason.trim(),
      }));
    } else if (action === "complete") {
      ({ error } = await supabase.rpc("complete_booking", {
        p_booking_id: booking.id,
      }));
    } else {
      ({ error } = await supabase.rpc("cancel_booking", {
        p_booking_id: booking.id,
        p_reason: reason.trim(),
      }));
    }
    setBusy(false);

    if (error) {
      setActionError(
        getBookingErrorMessage(error, t("provider.requests.updateErrorFallback")),
      );
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["provider", "bookings"] }),
      queryClient.invalidateQueries({ queryKey: ["bookings"] }),
      queryClient.invalidateQueries({ queryKey: ["booking", booking.id] }),
    ]);
    toast.success(
      action === "accept"
        ? t("provider.requests.bookingConfirmed")
        : action === "decline"
          ? t("provider.requests.requestDeclined")
          : action === "complete"
            ? t("provider.requests.bookingCompleted")
            : t("provider.requests.bookingCancelled"),
    );
    setReasonOpen(false);
    setReason("");
  }

  const isRequested = booking.status === "requested";
  const isConfirmed =
    booking.status === "accepted" || booking.status === "in_progress";

  return (
    <article className="rounded-xl border border-cream-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">{booking.snapshot_title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {t("provider.requests.customerName", {
              name: customerName,
            })}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {format(new Date(booking.scheduled_start), "PPP 'at' p")}
          </p>
        </div>
        <BookingStatusBadge status={booking.status} viewer="provider" />
      </div>

      <dl className="mt-4 grid gap-4 border-t border-cream-100 pt-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase text-slate-600">
            {t("provider.requests.serviceAddress")}
          </dt>
          <dd className="mt-1 whitespace-pre-line text-sm capitalize">
            {booking.address_text}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-slate-600">
            {t("provider.requests.priceSnapshot")}
          </dt>
          <dd className="mt-1 text-sm font-semibold">
            {formatBookingPrice(
              booking.snapshot_price_amount,
              booking.snapshot_currency,
            )}
          </dd>
        </div>
        {booking.notes && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase text-slate-600">
              {t("provider.requests.customerNotes")}
            </dt>
            <dd className="mt-1 whitespace-pre-line text-sm">
              {booking.notes}
            </dd>
          </div>
        )}
        {booking.decline_reason && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase text-slate-600">
              {t("provider.requests.declineReason")}
            </dt>
            <dd className="mt-1 whitespace-pre-line text-sm">
              {booking.decline_reason}
            </dd>
          </div>
        )}
        {booking.cancel_reason && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase text-slate-600">
              {t("provider.requests.cancellationReason")}
            </dt>
            <dd className="mt-1 whitespace-pre-line text-sm">
              {booking.cancel_reason}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-cream-100 pt-4">
        <Link
          to={`/bookings/${booking.id}`}
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {t("provider.requests.viewDetails")}
        </Link>
        {isRequested && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction("accept")}
              className="min-h-11 rounded-lg bg-teal-600 px-4 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {busy
                ? t("provider.requests.saving")
                : t("provider.requests.accept")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setReasonOpen(true)}
              className="min-h-11 rounded-lg border border-rose-600/40 px-4 text-sm font-medium text-rose-700 hover:bg-rose-600/5"
            >
              {t("provider.requests.decline")}
            </button>
          </>
        )}
        {isConfirmed && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction("complete")}
              className="min-h-11 rounded-lg bg-teal-600 px-4 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {busy
                ? t("provider.requests.saving")
                : t("provider.requests.markComplete")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setReasonOpen(true)}
              className="min-h-11 rounded-lg border border-rose-600/40 px-4 text-sm font-medium text-rose-700 hover:bg-rose-600/5"
            >
              {t("provider.requests.cancelJob")}
            </button>
          </>
        )}
      </div>

      {reasonOpen && (isRequested || isConfirmed) && (
        <form
          className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void runAction(isRequested ? "decline" : "cancel");
          }}
        >
          <label
            htmlFor={`reason-${booking.id}`}
            className="block text-sm font-medium"
          >
            {t(
              isRequested
                ? "provider.requests.reasonForDeclining"
                : "provider.requests.reasonForCancelling",
            )}
          </label>
          <textarea
            id={`reason-${booking.id}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={1000}
            rows={3}
            required
            className="w-full rounded-lg border border-slate-400/50 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600"
          />
          <p className="mt-1 text-xs text-slate-500">
            {t("provider.requests.reasonVisibleToCustomer")}
          </p>
          {actionError && (
            <p className="text-sm text-rose-600" role="alert">
              {actionError}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy || !reason.trim()}
              className="h-10 rounded-lg bg-rose-600 px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy
                ? t("provider.requests.saving")
                : isRequested
                  ? t("provider.requests.confirmDecline")
                  : t("provider.requests.confirmCancellation")}
            </button>
            <button
              type="button"
              onClick={() => setReasonOpen(false)}
              className="h-10 rounded-lg border border-ink/20 px-4 text-sm font-medium"
            >
              {t("provider.requests.keepRequest")}
            </button>
          </div>
        </form>
      )}
      {actionError && !reasonOpen && (
        <p className="mt-3 text-sm text-rose-600" role="alert">
          {actionError}
        </p>
      )}
    </article>
  );
}

export function ProviderRequestsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [filter, setFilter] = useState<InboxFilter>("new");
  const bookingsQuery = useQuery({
    queryKey: ["provider", "bookings", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, customer_id, status, scheduled_start, scheduled_end, completed_at, address_text, notes, snapshot_title, snapshot_price_amount, snapshot_currency, decline_reason, cancel_reason",
        )
        .eq("provider_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as Omit<ProviderBooking, "customer_name">[];
      if (rows.length === 0) return [];

      const { data: bookingNames, error: bookingNamesError } =
        await supabase.rpc("get_booking_customer_names", {
          p_booking_ids: rows.map((row) => row.id),
        });
      if (bookingNamesError) throw bookingNamesError;
      const customerNames = (bookingNames ??
        []) as Database["public"]["Functions"]["get_booking_customer_names"]["Returns"];
      const names = new Map(
        customerNames.map((booking) => [
          booking.booking_id,
          booking.customer_display_name,
        ]),
      );
      return rows.map((row) => ({
        ...row,
        customer_name: names.get(row.id) ?? "LocalServe member",
      })) as ProviderBooking[];
    },
  });

  const bookings = bookingsQuery.data ?? [];
  const visibleBookings = bookings.filter((booking) =>
    matchesFilter(booking.status, filter),
  );
  const monthStart = startOfMonth(new Date());
  const newCount = bookings.filter(
    (booking) => booking.status === "requested",
  ).length;
  const upcomingCount = bookings.filter(
    (booking) =>
      booking.status === "accepted" || booking.status === "in_progress",
  ).length;
  const completedCount = bookings.filter(
    (booking) =>
      booking.status === "completed" &&
      booking.completed_at !== null &&
      new Date(booking.completed_at).getTime() >= monthStart.getTime(),
  ).length;

  return (
    <div>
      <header className="border-b border-cream-100 pb-5">
        <p className="text-xs font-semibold uppercase text-slate-600">
          {t("provider.requests.provider")}
        </p>
        <h1 className="mt-1 text-3xl font-semibold">
          {t("provider.requests.title")}
        </h1>
      </header>

      <dl className="mt-5 grid grid-cols-3 gap-3">
        <div className="min-w-0 rounded-xl border border-cream-100 bg-white p-3">
          <dt className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
            <Inbox
              size={16}
              className="shrink-0 text-[#168A55]"
              aria-hidden="true"
            />
            <span className="min-w-0">{t("provider.requests.stats.new")}</span>
          </dt>
          <dd className="mt-1 text-xl font-semibold">
            {bookingsQuery.isPending ? "—" : newCount}
          </dd>
        </div>
        <div className="min-w-0 rounded-xl border border-cream-100 bg-white p-3">
          <dt className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
            <CalendarClock
              size={16}
              className="shrink-0 text-amber-500"
              aria-hidden="true"
            />
            <span className="min-w-0">
              {t("provider.requests.stats.upcoming")}
            </span>
          </dt>
          <dd className="mt-1 text-xl font-semibold">
            {bookingsQuery.isPending ? "—" : upcomingCount}
          </dd>
        </div>
        <div className="min-w-0 rounded-xl border border-cream-100 bg-white p-3">
          <dt className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
            <CheckCircle2
              size={16}
              className="shrink-0 text-[#168A55]"
              aria-hidden="true"
            />
            <span className="min-w-0">
              {t("provider.requests.stats.completedThisMonth")}
            </span>
          </dt>
          <dd className="mt-1 text-xl font-semibold">
            {bookingsQuery.isPending ? "—" : completedCount}
          </dd>
        </div>
      </dl>

      <div
        className="mt-5 flex flex-wrap gap-2"
        aria-label={t("provider.requests.filterRequests")}
      >
        {filterOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-pressed={filter === option.key}
            onClick={() => setFilter(option.key)}
            className={`h-9 rounded-full border px-3.5 text-sm font-medium ${filter === option.key ? "border-teal-600 bg-teal-600 text-white" : "border-ink/15 bg-white hover:bg-cream-100"}`}
          >
            {t(option.labelKey)}
          </button>
        ))}
      </div>

      {bookingsQuery.isPending ? (
        <div
          className="mt-6 space-y-3"
          role="status"
          aria-label={t("provider.requests.loading")}
        >
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-48 animate-pulse rounded-xl bg-white"
            />
          ))}
        </div>
      ) : bookingsQuery.isError ? (
        <div
          className="mt-6 rounded-xl border border-rose-600/20 bg-white p-5"
          role="alert"
        >
          <p className="font-medium">
            {t("provider.requests.loadError")}
          </p>
          <button
            type="button"
            onClick={() => void bookingsQuery.refetch()}
            className="mt-3 min-h-11 rounded-lg border border-ink/20 px-4 text-sm font-medium"
          >
            {t("provider.requests.tryAgain")}
          </button>
        </div>
      ) : visibleBookings.length === 0 ? (
        <div className="mt-6 rounded-xl border border-cream-100 bg-white py-10 text-center">
          <Inbox
            size={28}
            className="mx-auto text-slate-300"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-medium text-slate-600">
            {bookings.length === 0
              ? t("provider.requests.emptyTitle")
              : t("provider.requests.emptyFilteredTitle")}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {bookings.length === 0
              ? t("provider.requests.emptyDescription")
              : t("provider.requests.emptyFilteredDescription")}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {visibleBookings.map((booking) => (
            <ProviderBookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}
