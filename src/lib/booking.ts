export type BookingStatus =
  | "requested"
  | "accepted"
  | "declined"
  | "in_progress"
  | "completed"
  | "cancelled_by_customer"
  | "cancelled_by_provider";

export type BookingViewer = "customer" | "provider";

export function getBookingStatusLabel(
  status: BookingStatus,
  viewer: BookingViewer,
) {
  switch (status) {
    case "requested":
      return viewer === "provider" ? "New request" : "Waiting for provider";
    case "accepted":
    case "in_progress":
      return "Confirmed";
    case "declined":
      return "Declined";
    case "completed":
      return "Completed";
    case "cancelled_by_customer":
      return viewer === "customer"
        ? "Cancelled by you"
        : "Cancelled by customer";
    case "cancelled_by_provider":
      return viewer === "provider"
        ? "Cancelled by you"
        : "Cancelled by provider";
  }
}

export function getBookingErrorMessage(
  error: { code?: string; message?: string },
  fallback = "Something went wrong. Please try again.",
) {
  const message = error.message ?? error.code ?? "";
  const knownMessages: Record<string, string> = {
    AUTH_REQUIRED: "Sign in to continue.",
    BOOKING_NOT_FOUND: "This booking is no longer available.",
    BOOKING_OWN_LISTING: "You can’t request your own listing.",
    BOOKING_INVALID_TRANSITION:
      "This booking can’t be updated in its current status.",
    BOOKING_INVALID_SCHEDULE: "Check the selected booking times and try again.",
    LISTING_UNAVAILABLE: "This listing is no longer available.",
    CUSTOMER_ROLE_REQUIRED: "A customer account is required for this action.",
    PROVIDER_ROLE_REQUIRED: "A provider account is required for this action.",
    PROFILE_INACTIVE: "This account is inactive and cannot update bookings.",
    NOT_BOOKING_PARTY: "You don’t have access to this booking.",
    DECLINE_REASON_REQUIRED: "Enter a reason for declining this request.",
    CANCEL_REASON_REQUIRED: "Enter a reason for cancelling this booking.",
    REVIEW_BOOKING_NOT_COMPLETED:
      "Reviews are available after a booking is completed.",
    REVIEW_ALREADY_SUBMITTED: "You already reviewed this booking.",
    REVIEW_RATING_INVALID: "Choose a rating from 1 to 5 stars.",
    REVIEW_COMMENT_TOO_SHORT:
      "If you add a comment, use at least 10 characters.",
    REVIEW_COMMENT_TOO_LONG: "Review must be 2,000 characters or fewer.",
  };

  const match = Object.entries(knownMessages).find(([code]) =>
    message.includes(code),
  );
  return match?.[1] ?? fallback;
}

export function formatBookingPrice(amount: number, currency: string) {
  const formatted = new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 2,
  }).format(Number(amount));
  return `${currency.trim()} ${formatted}`;
}
