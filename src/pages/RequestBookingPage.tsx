import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
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

function getRpcMessage(error: { code?: string; message?: string }, t: TFunction) {
  const rpcCode = error.message ?? error.code;
  switch (rpcCode) {
    case "BOOKING_OWN_LISTING":
      return t("bookings.request.ownListingError");
    case "LISTING_UNAVAILABLE":
      return t("bookings.request.listingUnavailableError");
    case "CUSTOMER_ROLE_REQUIRED":
      return t("bookings.request.customerRequiredError");
    case "PROFILE_INACTIVE":
      return t("bookings.request.inactiveAccountError");
    case "BOOKING_INVALID_SCHEDULE":
      return t("bookings.request.invalidScheduleError");
    default:
      return t("bookings.request.sendError");
  }
}

export function RequestBookingPage() {
  const { t } = useTranslation();
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
      setSubmitError(t("bookings.request.ownListingError"));
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
      setSubmitError(getRpcMessage(error, t));
      return;
    }

    const booking = data as { id?: string } | null;
    if (!booking?.id) {
      setSubmitError(
        t("bookings.request.notSavedError"),
      );
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["bookings"] });
    toast.success(t("bookings.request.sentToast"));
    navigate(`/bookings/${booking.id}`, { replace: true });
  }

  if (listingQuery.isPending) {
    return (
      <div className="shell-container py-12" role="status">
        {t("bookings.request.loadingService")}
      </div>
    );
  }
  if (listingQuery.isError || !listingQuery.data) {
    return (
      <section className="shell-container py-12" role="alert">
        <h1 className="text-2xl font-semibold">
          {t("bookings.request.serviceUnavailable")}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t("bookings.request.listingInactive")}
        </p>
        <Link
          to="/search"
          className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-teal-600 px-5 text-sm font-medium text-white"
        >
          {t("bookings.request.browseServices")}
        </Link>
      </section>
    );
  }

  const listing = listingQuery.data;
  const isOwner = listing.provider_id === user?.id;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6 md:py-10">
      <BackButton
        fallback={`/listings/${id}`}
        label={t("bookings.request.backToListing")}
        className="mb-4"
      />
      <header className="mt-5 border-b border-cream-100 pb-5">
        <p className="text-xs font-semibold uppercase text-slate-600">
          {t("bookings.request.eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          {t("bookings.request.title", { title: listing.title })}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Rs.{" "}
          {new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(
            Number(listing.price_amount),
          )}
          {listing.pricing_type === "hourly"
            ? t("bookings.request.perHour")
            : t("bookings.request.fixedPrice")}
        </p>
      </header>

      {isOwner ? (
        <p
          className="mt-6 rounded-xl border border-rose-600/20 bg-white p-5 text-sm text-slate-600"
          role="alert"
        >
          {t("bookings.request.ownListingError")}
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
                {t("bookings.request.preferredStart")}{" "}
                <span className="text-red-500" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="scheduled-start"
                type="datetime-local"
                {...register("scheduled_start")}
                className="h-10 w-full rounded-lg border border-slate-400/50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-600"
              />
              <p className="mt-1 text-xs text-slate-500">
                {t("bookings.request.startHelp")}
              </p>
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
                {t("bookings.request.preferredEndOptional")}
              </label>
              <input
                id="scheduled-end"
                type="datetime-local"
                {...register("scheduled_end")}
                className="h-10 w-full rounded-lg border border-slate-400/50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-600"
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
              {t("bookings.request.serviceAddress")}{" "}
              <span className="text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <textarea
              id="booking-address"
              rows={3}
              {...register("address_text")}
              className="w-full rounded-lg border border-slate-400/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600"
            />
            <p className="mt-1 text-xs text-slate-500">
              {t("bookings.request.addressHelp")}
            </p>
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
              {t("bookings.request.notesOptional")}
            </label>
            <textarea
              id="booking-notes"
              rows={3}
              {...register("notes")}
              className="w-full rounded-lg border border-slate-400/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600"
            />
            <p className="mt-1 text-xs text-slate-500">
              {t("bookings.request.notesHelp")}
            </p>
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
            {t("bookings.request.paymentNotice")}
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 w-full rounded-xl bg-teal-600 px-5 font-medium text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {isSubmitting
              ? t("bookings.request.submitting")
              : t("bookings.request.submit")}
          </button>
        </form>
      )}
    </section>
  );
}
