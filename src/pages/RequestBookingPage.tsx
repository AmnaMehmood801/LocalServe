import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "../lib/toast";
import { z } from "zod";

import { useAuth } from "../app/AuthContext";
import { BackButton } from "../components/ui/BackButton";
import { supabase } from "../lib/supabase";

const requestSchema = z
  .object({
    scheduled_start: z.string().min(1, "Choose a date and start time."),
    scheduled_end: z.string().optional(),
    address_text: z.string().trim().min(5, "Enter the service address."),
    notes: z
      .string()
      .trim()
      .max(2000, "Notes must be 2,000 characters or fewer."),
  })
  .superRefine((values, context) => {
    const start = new Date(values.scheduled_start).getTime();
    if (!Number.isFinite(start) || start <= Date.now()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduled_start"],
        message: "Choose a future date and time.",
      });
      return;
    }
    if (values.scheduled_end) {
      const end = new Date(values.scheduled_end).getTime();
      if (!Number.isFinite(end) || end <= start) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scheduled_end"],
          message: "End time must be after the start time.",
        });
      }
    }
  });

type RequestValues = z.infer<typeof requestSchema>;
type RequestableListing = {
  id: string;
  provider_id: string;
  title: string;
  description: string;
  pricing_type: "hourly" | "fixed";
  price_amount: number;
  currency: string;
};

function getRpcMessage(error: { code?: string; message?: string }) {
  const rpcCode = error.message ?? error.code;
  switch (rpcCode) {
    case "BOOKING_OWN_LISTING":
      return "You can’t request your own listing.";
    case "LISTING_UNAVAILABLE":
      return "This listing is no longer available.";
    case "CUSTOMER_ROLE_REQUIRED":
      return "A customer account is required to request a service.";
    case "PROFILE_INACTIVE":
      return "This account is inactive and cannot request a booking.";
    case "BOOKING_INVALID_SCHEDULE":
      return "Check the selected booking times and try again.";
    default:
      return "Could not send the booking request. Please try again.";
  }
}

export function RequestBookingPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      scheduled_start: "",
      scheduled_end: "",
      address_text: "",
      notes: "",
    },
  });

  const listingQuery = useQuery({
    queryKey: ["listing", "request", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id, provider_id, title, description, pricing_type, price_amount, currency",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as RequestableListing | null;
    },
  });

  async function onSubmit(values: RequestValues) {
    setSubmitError(null);
    const listing = listingQuery.data;
    if (!listing || !user) return;
    if (listing.provider_id === user.id) {
      setSubmitError("You can’t request your own listing.");
      return;
    }

    const { data, error } = await supabase.rpc("create_booking", {
      p_listing_id: listing.id,
      p_scheduled_start: new Date(values.scheduled_start).toISOString(),
      p_scheduled_end: values.scheduled_end
        ? new Date(values.scheduled_end).toISOString()
        : null,
      p_address_text: values.address_text,
      p_notes: values.notes || null,
    });

    if (error) {
      setSubmitError(getRpcMessage(error));
      return;
    }

    const booking = data as { id?: string } | null;
    if (!booking?.id) {
      setSubmitError(
        "Your request may not have been saved. Check your bookings before retrying.",
      );
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["bookings"] });
    toast.success("Your request was sent.");
    navigate(`/bookings/${booking.id}`, { replace: true });
  }

  if (listingQuery.isPending) {
    return (
      <div className="shell-container py-12" role="status">
        Loading service...
      </div>
    );
  }
  if (listingQuery.isError || !listingQuery.data) {
    return (
      <section className="shell-container py-12" role="alert">
        <h1 className="text-2xl font-semibold">Service unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">
          This listing may be inactive or no longer available.
        </p>
        <Link
          to="/search"
          className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-teal-600 px-5 text-sm font-medium text-white"
        >
          Browse services
        </Link>
      </section>
    );
  }

  const listing = listingQuery.data;
  const isOwner = listing.provider_id === user?.id;

  return (
    <section className="shell-container max-w-3xl py-8 md:py-10">
      <BackButton
        fallback={`/listings/${id}`}
        label="Back to listing"
        className="mb-4"
      />
      <header className="mt-5 border-b border-cream-100 pb-5">
        <p className="text-xs font-semibold uppercase text-slate-600">
          Booking request
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Request {listing.title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Rs.{" "}
          {new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(
            Number(listing.price_amount),
          )}
          {listing.pricing_type === "hourly" ? " / hr" : " fixed"}
        </p>
      </header>

      {isOwner ? (
        <p
          className="mt-6 rounded-xl border border-rose-600/20 bg-white p-5 text-sm text-slate-600"
          role="alert"
        >
          You can’t request your own listing.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-5 rounded-xl border border-cream-100 bg-white p-5 shadow-sm md:p-7"
          noValidate
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="scheduled-start"
                className="mb-1 block text-sm font-medium"
              >
                Preferred start
              </label>
              <input
                id="scheduled-start"
                type="datetime-local"
                {...register("scheduled_start")}
                className="min-h-11 w-full rounded-lg border border-slate-400/50 px-3 outline-none focus:ring-2 focus:ring-teal-600"
              />
              {errors.scheduled_start && (
                <p className="mt-1 text-sm text-rose-600">
                  {errors.scheduled_start.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="scheduled-end"
                className="mb-1 block text-sm font-medium"
              >
                Preferred end (optional)
              </label>
              <input
                id="scheduled-end"
                type="datetime-local"
                {...register("scheduled_end")}
                className="min-h-11 w-full rounded-lg border border-slate-400/50 px-3 outline-none focus:ring-2 focus:ring-teal-600"
              />
              {errors.scheduled_end && (
                <p className="mt-1 text-sm text-rose-600">
                  {errors.scheduled_end.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="booking-address"
              className="mb-1 block text-sm font-medium"
            >
              Service address
            </label>
            <textarea
              id="booking-address"
              rows={3}
              {...register("address_text")}
              className="w-full rounded-lg border border-slate-400/50 px-3 py-2 outline-none focus:ring-2 focus:ring-teal-600"
            />
            {errors.address_text && (
              <p className="mt-1 text-sm text-rose-600">
                {errors.address_text.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="booking-notes"
              className="mb-1 block text-sm font-medium"
            >
              Notes (optional)
            </label>
            <textarea
              id="booking-notes"
              rows={3}
              {...register("notes")}
              className="w-full rounded-lg border border-slate-400/50 px-3 py-2 outline-none focus:ring-2 focus:ring-teal-600"
            />
            {errors.notes && (
              <p className="mt-1 text-sm text-rose-600">
                {errors.notes.message}
              </p>
            )}
          </div>

          {submitError && (
            <p
              className="rounded-lg bg-rose-600/5 p-3 text-sm text-rose-600"
              role="alert"
            >
              {submitError}
            </p>
          )}
          <p className="text-xs leading-5 text-slate-600">
            This sends a request, not an instant booking. Agree payment directly
            with your provider.
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 w-full rounded-xl bg-teal-600 px-5 font-medium text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {isSubmitting ? "Sending request..." : "Send request"}
          </button>
        </form>
      )}
    </section>
  );
}
