import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "../lib/toast";
import { z } from "zod";

import { useAuth } from "../app/AuthContext";
import { Avatar } from "../components/Avatar";
import { BookingStatusBadge } from "../components/booking/BookingStatusBadge";
import { BackButton } from "../components/ui/BackButton";
import {
  formatBookingPrice,
  getBookingErrorMessage,
  type BookingStatus,
} from "../lib/booking";
import type { Database } from "../lib/database.types";
import { supabase } from "../lib/supabase";

type BookingDetails = {
  id: string;
  listing_id: string;
  customer_id: string;
  provider_id: string;
  status: BookingStatus;
  scheduled_start: string;
  scheduled_end: string | null;
  address_text: string;
  notes: string | null;
  snapshot_title: string;
  snapshot_pricing_type: "hourly" | "fixed";
  snapshot_price_amount: number;
  snapshot_currency: string;
  decline_reason: string | null;
  cancel_reason: string | null;
  completed_at: string | null;
  counterpart_name: string | null;
  counterpart_avatar_path: string | null;
  review: {
    id: string;
    rating: number;
    comment: string | null;
    is_hidden: boolean;
  } | null;
};

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .max(2000, "Review must be 2,000 characters or fewer.")
    .refine((comment) => !comment || comment.length >= 10, {
      message: "If you add a comment, use at least 10 characters.",
    }),
});

type ReviewValues = z.infer<typeof reviewSchema>;

const contactStatuses: BookingStatus[] = [
  "accepted",
  "in_progress",
  "completed",
];

export function BookingDetailPage() {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const reviewForm = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5, comment: "" },
    mode: "onChange",
  });

  const bookingQuery = useQuery({
    queryKey: ["booking", id, user?.id],
    enabled: Boolean(id && user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, listing_id, customer_id, provider_id, status, scheduled_start, scheduled_end, address_text, notes, snapshot_title, snapshot_pricing_type, snapshot_price_amount, snapshot_currency, decline_reason, cancel_reason, completed_at",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const row = data as Omit<
        BookingDetails,
        "counterpart_name" | "counterpart_avatar_path"
      >;
      const isCustomer = row.customer_id === user!.id;
      let counterpartName: string | null = null;
      let counterpartAvatarPath: string | null = null;
      if (isCustomer) {
        const { data: publicProfile } = await supabase
          .from("profiles_public")
          .select("display_name, avatar_path")
          .eq("id", row.provider_id)
          .maybeSingle();
        counterpartName = publicProfile?.display_name?.trim() || null;
        counterpartAvatarPath = publicProfile?.avatar_path ?? null;
      } else {
        const { data: bookingNames } = await supabase.rpc(
          "get_booking_customer_names",
          { p_booking_ids: [row.id] },
        );
        const customerNames = (bookingNames ??
          []) as Database["public"]["Functions"]["get_booking_customer_names"]["Returns"];
        counterpartName =
          customerNames[0]?.customer_display_name?.trim() || null;
      }

      let review: BookingDetails["review"] = null;
      if (isCustomer && row.status === "completed") {
        const { data: reviewRow, error: reviewError } = await supabase
          .from("reviews")
          .select("id, rating, comment, is_hidden")
          .eq("booking_id", row.id)
          .maybeSingle();
        if (reviewError) throw reviewError;
        review = reviewRow as BookingDetails["review"];
      }

      return {
        ...row,
        counterpart_name: counterpartName,
        counterpart_avatar_path: counterpartAvatarPath,
        review,
      } satisfies BookingDetails;
    },
  });

  const contactBooking = bookingQuery.data;
  const isBookingParty = Boolean(
    contactBooking &&
    user &&
    (contactBooking.customer_id === user.id ||
      contactBooking.provider_id === user.id),
  );
  const contactPersonId = contactBooking
    ? contactBooking.customer_id === user?.id
      ? contactBooking.provider_id
      : contactBooking.customer_id
    : null;
  const contactQuery = useQuery({
    queryKey: ["booking-contact", id, contactPersonId],
    enabled: Boolean(
      contactBooking &&
      isBookingParty &&
      contactPersonId &&
      contactStatuses.includes(contactBooking.status),
    ),
    retry: false,
    queryFn: async () => {
      if (!contactPersonId) throw new Error("Booking contact is unavailable.");
      const { data, error } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", contactPersonId)
        .maybeSingle();
      if (error) throw error;
      return data?.phone ?? null;
    },
  });

  async function cancelBooking() {
    const booking = bookingQuery.data;
    if (!booking) return;
    setActionError(null);
    setIsCancelling(true);
    const { error } = await supabase.rpc("cancel_booking", {
      p_booking_id: booking.id,
      p_reason: cancelReason.trim() || null,
    });
    setIsCancelling(false);
    if (error) {
      setActionError(
        getBookingErrorMessage(error, t("bookings.detail.cancelError")),
      );
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["booking", id] }),
      queryClient.invalidateQueries({ queryKey: ["bookings"] }),
      queryClient.invalidateQueries({ queryKey: ["provider", "bookings"] }),
    ]);
    toast.success(t("bookings.detail.cancelledToast"));
    setShowCancel(false);
    await bookingQuery.refetch();
  }

  async function submitReview(values: ReviewValues) {
    const booking = bookingQuery.data;
    if (!booking || !isCustomerBooking(booking, user?.id)) return;
    setActionError(null);
    const { error } = await supabase.rpc("submit_review", {
      p_booking_id: booking.id,
      p_rating: values.rating,
      p_comment: values.comment || null,
    });
    if (error) {
      setActionError(
        getBookingErrorMessage(error, t("bookings.detail.reviewError")),
      );
      return;
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["booking", id] }),
      queryClient.invalidateQueries({ queryKey: ["bookings"] }),
      queryClient.invalidateQueries({ queryKey: ["reviews"] }),
      queryClient.invalidateQueries({
        queryKey: ["listing", "detail", booking.listing_id],
      }),
    ]);
    toast.success(t("bookings.detail.reviewSubmittedToast"));
    await bookingQuery.refetch();
  }

  if (bookingQuery.isPending) {
    return (
      <div className="shell-container py-12" role="status">
        {t("bookings.detail.loading")}
      </div>
    );
  }
  if (bookingQuery.isError || !bookingQuery.data) {
    return (
      <section className="shell-container py-12" role="alert">
        <h1 className="text-2xl font-semibold">
          {t("bookings.detail.unavailableTitle")}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t("bookings.detail.unavailableDescription")}
        </p>
        <BackButton
          fallback="/bookings"
          label={t("bookings.detail.backToBookings")}
          className="mt-5"
        />
      </section>
    );
  }

  const booking = bookingQuery.data;
  const isCustomer = booking.customer_id === user?.id;
  const isProvider = booking.provider_id === user?.id;
  const viewer = isProvider ? "provider" : "customer";
  const canCancel =
    isCustomer &&
    (booking.status === "requested" || booking.status === "accepted");
  const reasonRequired = booking.status === "accepted";
  const backPath = isProvider ? "/provider/requests" : "/bookings";

  if (!isCustomer && !isProvider) {
    return (
      <section className="shell-container py-12" role="alert">
        {t("bookings.detail.accessDenied")}
      </section>
    );
  }

  return (
    <section className="shell-container max-w-3xl py-6 md:py-8">
      <BackButton
        fallback={backPath}
        label={
          isProvider
            ? t("bookings.detail.backToRequests")
            : t("bookings.detail.backToBookings")
        }
      />
      <header className="mt-3 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-600">
            {t("bookings.detail.heading")}
          </p>
          <h1 className="mt-1 text-3xl font-semibold">
            {booking.snapshot_title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {t(
              isCustomer
                ? "bookings.detail.provider"
                : "bookings.detail.customer",
            )}:{" "}
            {isCustomer && booking.provider_id ? (
              <Link
                to={`/providers/${booking.provider_id}`}
                className="inline-flex items-center gap-1.5 text-[#168A55] no-underline hover:underline"
              >
                <Avatar
                  avatarPath={booking.counterpart_avatar_path}
                  name={booking.counterpart_name ?? t("bookings.detail.memberFallback")}
                  size={40}
                />
                {booking.counterpart_name ?? t("bookings.detail.memberFallback")}
              </Link>
            ) : (
              (booking.counterpart_name ?? t("bookings.detail.memberFallback"))
            )}
          </p>
        </div>
        <BookingStatusBadge status={booking.status} viewer={viewer} />
      </header>

      <dl className="mt-4 grid gap-x-8 gap-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 md:p-6">
        <div>
          <dt className="text-xs font-medium uppercase text-slate-600">
            {t("bookings.detail.preferredTime")}
          </dt>
          <dd className="mt-1 font-medium">
            {format(new Date(booking.scheduled_start), "PPP 'at' p")}
          </dd>
          {booking.scheduled_end && (
            <dd className="text-sm text-slate-600">
              {t("bookings.detail.untilTime", {
                time: format(new Date(booking.scheduled_end), "p"),
              })}
            </dd>
          )}
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-slate-600">
            {t("bookings.detail.priceSnapshot")}
          </dt>
          <dd className="mt-1 font-semibold">
            {formatBookingPrice(
              booking.snapshot_price_amount,
              booking.snapshot_currency,
            )}
            <span className="ms-1 font-normal text-slate-600">
              {booking.snapshot_pricing_type === "hourly"
                ? t("bookings.detail.perHour")
                : t("bookings.detail.fixedPrice")}
            </span>
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase text-slate-600">
            {t("bookings.detail.serviceAddress")}
          </dt>
          <dd className="mt-1 whitespace-pre-line capitalize">
            {booking.address_text}
          </dd>
        </div>
        {booking.notes && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase text-slate-600">
              {t("bookings.detail.notes")}
            </dt>
            <dd className="mt-1 whitespace-pre-line">{booking.notes}</dd>
          </div>
        )}
        {booking.decline_reason && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase text-slate-600">
              {t("bookings.detail.providerReason")}
            </dt>
            <dd className="mt-1 whitespace-pre-line">
              {booking.decline_reason}
            </dd>
          </div>
        )}
        {booking.cancel_reason && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase text-slate-600">
              {t("bookings.detail.cancellationReason")}
            </dt>
            <dd className="mt-1 whitespace-pre-line">
              {booking.cancel_reason}
            </dd>
          </div>
        )}
        {contactStatuses.includes(booking.status) && (
          <div>
            <dt className="text-xs font-medium uppercase text-slate-600">
              {t(
                isProvider
                  ? "bookings.detail.customerPhone"
                  : "bookings.detail.providerPhone",
              )}
            </dt>
            {contactQuery.isError ? (
              <dd className="mt-1 text-sm text-rose-600" role="alert">
                {t("bookings.detail.contactLoadError")}{" "}
                <button
                  type="button"
                  onClick={() => void contactQuery.refetch()}
                  disabled={contactQuery.isFetching}
                  className="font-medium underline disabled:opacity-50"
                >
                  {t("bookings.detail.retry")}
                </button>
              </dd>
            ) : (
              <dd className="mt-1">
                {contactQuery.isPending
                  ? t("bookings.detail.loadingContact")
                  : (contactQuery.data ?? t("bookings.detail.noPhone"))}
              </dd>
            )}
          </div>
        )}
      </dl>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <Info
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-slate-600"
        />
        <p>
          {t("bookings.detail.paymentNotice")}
        </p>
      </div>

      {actionError && (
        <p
          className="mt-4 rounded-lg bg-rose-600/5 p-3 text-sm text-rose-600"
          role="alert"
        >
          {actionError}
        </p>
      )}
      {canCancel && !showCancel && (
        <button
          type="button"
          onClick={() => setShowCancel(true)}
          className="mt-5 min-h-11 rounded-xl border border-rose-600/40 bg-white px-5 text-sm font-medium text-rose-700 hover:bg-rose-600/5"
        >
          {t("bookings.detail.cancelBooking")}
        </button>
      )}
      {canCancel && showCancel && (
        <form
          className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void cancelBooking();
          }}
        >
          <label htmlFor="cancel-reason" className="block text-sm font-medium">
            {t(
              reasonRequired
                ? "bookings.detail.cancelReasonRequired"
                : "bookings.detail.cancelReasonOptional",
            )}
          </label>
          <textarea
            id="cancel-reason"
            rows={3}
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            maxLength={1000}
            required={reasonRequired}
            className="w-full rounded-lg border border-slate-400/50 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1DBF73]"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={
                isCancelling || (reasonRequired && !cancelReason.trim())
              }
              className="min-h-11 rounded-xl bg-rose-600 px-5 text-sm font-medium text-white disabled:opacity-50"
            >
              {isCancelling
                ? t("bookings.detail.cancelling")
                : t("bookings.detail.confirmCancellation")}
            </button>
            <button
              type="button"
              onClick={() => setShowCancel(false)}
              className="min-h-11 rounded-xl border border-ink/20 px-5 text-sm font-medium"
            >
              {t("bookings.detail.keepBooking")}
            </button>
          </div>
        </form>
      )}
      {booking.status === "completed" && isCustomer && (
        <section className="mt-6 border-t border-slate-200 pt-6">
          <h2 className="text-xl font-semibold">
            {t("bookings.detail.yourReview")}
          </h2>
          {booking.review ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-5">
              <p
                className="text-amber-500"
                aria-label={t("bookings.detail.ratingStarsAria", {
                  rating: booking.review.rating,
                })}
              >
                {"★".repeat(booking.review.rating)}
                {"☆".repeat(5 - booking.review.rating)}
              </p>
              {booking.review.comment && (
                <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
                  {booking.review.comment}
                </p>
              )}
              {booking.review.is_hidden && (
                <p className="mt-2 text-xs text-slate-600">
                  {t("bookings.detail.reviewHidden")}
                </p>
              )}
            </div>
          ) : (
            <form
              onSubmit={reviewForm.handleSubmit(submitReview)}
              noValidate
              className="mt-3 space-y-4 rounded-xl border border-slate-200 bg-white p-5"
            >
              <fieldset>
                <legend className="mb-2 text-sm font-medium">
                  {t("bookings.detail.rating")}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <label
                      key={rating}
                      className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-400/40 px-3 has-[:checked]:border-[#1DBF73] has-[:checked]:bg-[#E3F7EC]"
                    >
                      <input
                        type="radio"
                        value={rating}
                        {...reviewForm.register("rating", {
                          valueAsNumber: true,
                        })}
                      />
                      <span className="text-amber-500" aria-hidden="true">
                        {"★".repeat(rating)}
                      </span>
                      <span className="sr-only">
                        {t("bookings.detail.ratingStars", { count: rating })}
                      </span>
                    </label>
                  ))}
                </div>
                {reviewForm.formState.errors.rating && (
                  <p className="mt-1 text-sm text-rose-600">
                    {t("bookings.detail.chooseRating")}
                  </p>
                )}
              </fieldset>
              <div>
                <label
                  htmlFor="booking-review-comment"
                  className="mb-1 block text-sm font-medium"
                >
                  {t("bookings.detail.commentOptional")}
                </label>
                <textarea
                  id="booking-review-comment"
                  rows={4}
                  maxLength={2000}
                  {...reviewForm.register("comment")}
                  className="w-full rounded-lg border border-slate-400/50 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1DBF73]"
                />
                {reviewForm.formState.errors.comment && (
                  <p className="mt-1 text-sm text-rose-600">
                    {reviewForm.formState.errors.comment.message}
                  </p>
                )}
              </div>
              {actionError && (
                <p className="text-sm text-rose-600" role="alert">
                  {actionError}
                </p>
              )}
              <button
                type="submit"
                disabled={reviewForm.formState.isSubmitting}
                className="min-h-11 rounded-xl bg-[#1DBF73] px-5 text-sm font-medium text-white hover:bg-[#19A463] disabled:opacity-50"
              >
                {reviewForm.formState.isSubmitting
                  ? t("bookings.detail.submittingReview")
                  : t("bookings.detail.submitReview")}
              </button>
            </form>
          )}
        </section>
      )}
    </section>
  );
}

function isCustomerBooking(
  booking: BookingDetails,
  userId: string | undefined,
) {
  return booking.customer_id === userId;
}
