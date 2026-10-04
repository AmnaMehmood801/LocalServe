import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { AdminDataTable } from "../../components/admin/AdminDataTable";
import { AdminDataBoundary } from "../../components/admin/AdminDataBoundary";
import {
  AdminPageHeader,
  AdminStatusBadge,
} from "../../components/admin/AdminPageState";
import {
  bookingStatusLabel,
  bookingStatusTone,
  formatAdminDate,
  formatAdminMoney,
} from "../../components/admin/adminFormat";
import { useAdminData } from "../../components/admin/useAdminData";
import { buildAdminBookings, type AdminBooking } from "../../lib/admin";

export function AdminBookingsPage() {
  const query = useAdminData();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
  const detailsTrigger = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!selectedBooking) return;
    document.getElementById("admin-booking-close")?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedBooking(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      detailsTrigger.current?.focus();
    };
  }, [selectedBooking]);

  return (
    <AdminDataBoundary query={query}>
      {(data) => (
        <>
          <AdminPageHeader
            title="Bookings"
            description="Search bookings by ID, customer, provider, or service. Private address and phone fields are intentionally omitted."
          />
          <AdminDataTable
            title="Booking records"
            rows={buildAdminBookings(data)}
            getKey={(row) => row.id}
            getSearchText={(row) =>
              `${row.id} ${row.customerName} ${row.providerName} ${row.snapshot_title} ${row.status}`
            }
            emptyMessage="No bookings found."
            filters={[
              {
                label: "Status",
                value: statusFilter,
                onChange: setStatusFilter,
                valueForRow: (row) => row.status,
                options: [
                  { label: "All statuses", value: "all" },
                  ...[
                    "requested",
                    "accepted",
                    "declined",
                    "in_progress",
                    "completed",
                    "cancelled_by_customer",
                    "cancelled_by_provider",
                  ].map((status) => ({
                    label: bookingStatusLabel(status as AdminBooking["status"]),
                    value: status,
                  })),
                ],
              },
            ]}
            columns={[
              {
                header: "Booking",
                render: (row) => (
                  <div>
                    <p className="font-mono text-xs text-ink">{row.id.slice(0, 8)}</p>
                    <p className="mt-1 text-xs text-slate-600">{row.snapshot_title}</p>
                  </div>
                ),
              },
              { header: "Customer", render: (row) => row.customerName },
              { header: "Provider", render: (row) => row.providerName },
              {
                header: "Amount",
                render: (row) =>
                  formatAdminMoney(row.snapshot_price_amount, row.snapshot_currency),
              },
              {
                header: "Status",
                render: (row) => (
                  <AdminStatusBadge tone={bookingStatusTone(row.status)}>
                    {bookingStatusLabel(row.status)}
                  </AdminStatusBadge>
                ),
              },
              { header: "Created", render: (row) => formatAdminDate(row.created_at) },
              {
                header: "Details",
                render: (row) => (
                  <button
                    type="button"
                    onClick={(event) => {
                      detailsTrigger.current = event.currentTarget;
                      setSelectedBooking(row);
                    }}
                    className="min-h-10 rounded-lg border border-cream-100 px-3 text-sm font-medium text-teal-700 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    View
                  </button>
                ),
              },
            ]}
          />
          {selectedBooking && (
            <div
              className="fixed inset-0 z-50 grid place-items-center bg-navy-950/60 p-4"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setSelectedBooking(null);
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-booking-title"
                className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs text-slate-600">
                      Booking {selectedBooking.id}
                    </p>
                    <h2 id="admin-booking-title" className="mt-1 text-xl font-semibold text-ink">
                      {selectedBooking.snapshot_title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    id="admin-booking-close"
                    aria-label="Close booking details"
                    onClick={() => setSelectedBooking(null)}
                    className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-cream-50 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
                <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Detail label="Customer" value={selectedBooking.customerName} />
                  <Detail label="Provider" value={selectedBooking.providerName} />
                  <Detail
                    label="Status"
                    value={bookingStatusLabel(selectedBooking.status)}
                  />
                  <Detail
                    label="Amount"
                    value={formatAdminMoney(
                      selectedBooking.snapshot_price_amount,
                      selectedBooking.snapshot_currency,
                    )}
                  />
                  <Detail
                    label="Scheduled"
                    value={formatAdminDate(selectedBooking.scheduled_start)}
                  />
                  <Detail
                    label="Created"
                    value={formatAdminDate(selectedBooking.created_at)}
                  />
                </dl>
                <p className="mt-5 rounded-xl bg-cream-50 p-4 text-sm text-slate-600">
                  Booking address, phone, and notes are not displayed in the admin panel.
                </p>
              </section>
            </div>
          )}
        </>
      )}
    </AdminDataBoundary>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-600">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}
