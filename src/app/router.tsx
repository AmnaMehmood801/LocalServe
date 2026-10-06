import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { GuestOnlyRoute, ProtectedRoute } from "./ProtectedRoute";
import { PublicLayout } from "../layouts/PublicLayout";
import { HomePage } from "../pages/HomePage";
import { AccountPage } from "../pages/AccountPage";
import { BookingDetailPage } from "../pages/BookingDetailPage";
import { CustomerBookingsPage } from "../pages/CustomerBookingsPage";
import { ListingDetailPage } from "../pages/ListingDetailPage";
import { LoginPage } from "../pages/LoginPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { PrivacyPage } from "../pages/PrivacyPage";
import ProviderHubPage from "../pages/ProviderHubPage";
import ProviderOverviewPage from "../pages/ProviderOverviewPage";
import { ProviderListingFormPage } from "../pages/ProviderListingFormPage";
import { ProviderListingsPage } from "../pages/ProviderListingsPage";
import { ProviderRequestsPage } from "../pages/ProviderRequestsPage";
import { PublicProviderPage } from "../pages/PublicProviderPage";
import { RegisterPage } from "../pages/RegisterPage";
import { RequestBookingPage } from "../pages/RequestBookingPage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { SearchPage } from "../pages/SearchPage";
import { TermsPage } from "../pages/TermsPage";

const AdminLayout = lazy(() =>
  import("../layouts/AdminLayout").then((module) => ({
    default: module.AdminLayout,
  })),
);
const AdminBookingsPage = lazy(() =>
  import("../pages/admin/AdminBookingsPage").then((module) => ({
    default: module.AdminBookingsPage,
  })),
);
const AdminCategoriesPage = lazy(() =>
  import("../pages/admin/AdminCategoriesPage").then((module) => ({
    default: module.AdminCategoriesPage,
  })),
);
const AdminCitiesPage = lazy(() =>
  import("../pages/admin/AdminCitiesPage").then((module) => ({
    default: module.AdminCitiesPage,
  })),
);
const AdminDashboardPage = lazy(() =>
  import("../pages/admin/AdminDashboardPage").then((module) => ({
    default: module.AdminDashboardPage,
  })),
);
const AdminListingsPage = lazy(() =>
  import("../pages/admin/AdminListingsPage").then((module) => ({
    default: module.AdminListingsPage,
  })),
);
const AdminProvidersPage = lazy(() =>
  import("../pages/admin/AdminProvidersPage").then((module) => ({
    default: module.AdminProvidersPage,
  })),
);
const AdminReportsPage = lazy(() =>
  import("../pages/admin/AdminReportsPage").then((module) => ({
    default: module.AdminReportsPage,
  })),
);
const AdminReviewsPage = lazy(() =>
  import("../pages/admin/AdminReviewsPage").then((module) => ({
    default: module.AdminReviewsPage,
  })),
);
const AdminSettingsPage = lazy(() =>
  import("../pages/admin/AdminSettingsPage").then((module) => ({
    default: module.AdminSettingsPage,
  })),
);
const AdminUsersPage = lazy(() =>
  import("../pages/admin/AdminUsersPage").then((module) => ({
    default: module.AdminUsersPage,
  })),
);

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/search", element: <SearchPage /> },
      { path: "/listings/:id", element: <ListingDetailPage /> },
      { path: "/providers/:id", element: <PublicProviderPage /> },
      { path: "/privacy", element: <PrivacyPage /> },
      { path: "/terms", element: <TermsPage /> },
      {
        element: <GuestOnlyRoute />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/register", element: <RegisterPage /> },
          { path: "/forgot-password", element: <ForgotPasswordPage /> },
        ],
      },
      { path: "/reset-password", element: <ResetPasswordPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "/account",
            element: <AccountPage />,
          },
          { path: "/bookings/:id", element: <BookingDetailPage /> },
        ],
      },
      {
        element: <ProtectedRoute requiredRole="customer" />,
        children: [
          {
            path: "/bookings",
            element: <CustomerBookingsPage />,
          },
          {
            path: "/listings/:id/request",
            element: <RequestBookingPage />,
          },
        ],
      },
      {
        element: <ProtectedRoute requiredRole="provider" />,
        children: [
          {
            path: "/provider",
            element: <ProviderHubPage />,
            children: [
              { index: true, element: <ProviderOverviewPage /> },
              { path: "listings", element: <ProviderListingsPage /> },
              { path: "requests", element: <ProviderRequestsPage /> },
            ],
          },
          {
            path: "/provider/listings/new",
            element: <ProviderListingFormPage />,
          },
          {
            path: "/provider/listings/:id/edit",
            element: <ProviderListingFormPage />,
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    path: "/admin",
    element: <ProtectedRoute requiredRole="admin" />,
    children: [
      {
        element: (
          <Suspense
            fallback={
              <div
                className="min-h-screen bg-cream-50 px-6 py-16 text-center text-sm text-slate-600"
                role="status"
              >
                Loading admin workspace…
              </div>
            }
          >
            <AdminLayout />
          </Suspense>
        ),
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: "users", element: <AdminUsersPage /> },
          { path: "providers", element: <AdminProvidersPage /> },
          { path: "listings", element: <AdminListingsPage /> },
          { path: "bookings", element: <AdminBookingsPage /> },
          { path: "reviews", element: <AdminReviewsPage /> },
          { path: "cities", element: <AdminCitiesPage /> },
          { path: "categories", element: <AdminCategoriesPage /> },
          { path: "reports", element: <AdminReportsPage /> },
          { path: "settings", element: <AdminSettingsPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
