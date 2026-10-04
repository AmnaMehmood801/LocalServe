import { Link, Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./AuthContext";

export function ProtectedRoute({ requiredRole }: { requiredRole?: string }) {
  const { user, roles, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="shell-container py-16 text-sm text-slate-600"
        role="status"
      >
        Checking your session...
      </div>
    );
  }

  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (requiredRole && !roles.includes(requiredRole)) {
    if (requiredRole === "admin") {
      return (
        <section className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-4 py-16 text-center">
          <div className="max-w-md rounded-2xl border border-cream-100 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              LocalServe
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Access restricted</h1>
            <p className="mt-3 text-sm text-slate-600">
              You don’t have permission to access the LocalServe admin panel.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                className="inline-flex min-h-11 items-center rounded-xl bg-teal-600 px-5 font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
                to="/"
              >
                Go home
              </Link>
              <Link
                className="inline-flex min-h-11 items-center rounded-xl border border-ink/20 bg-white px-5 font-medium hover:bg-cream-50 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
                to="/account"
              >
                Go to account
              </Link>
            </div>
          </div>
        </section>
      );
    }
    return (
      <section className="shell-container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <h1 className="text-2xl font-semibold">
          You don’t have access to this section.
        </h1>
        <Link
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-teal-600 px-5 font-medium text-white hover:bg-teal-700"
          to="/"
        >
          Go home
        </Link>
      </section>
    );
  }

  return <Outlet />;
}

export function GuestOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="shell-container py-16 text-sm text-slate-600"
        role="status"
      >
        Checking your session...
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
