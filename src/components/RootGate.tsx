import { Navigate } from "react-router-dom";

import { useAuth } from "../app/AuthContext";
import { HomePage } from "../pages/HomePage";

export function RootGate() {
  const { user, roles, loading, profileError } = useAuth();

  if (loading) {
    return (
      <main className="shell-container py-8" role="status">
        <div className="h-16 rounded-xl bg-slate-100" />
        <span className="sr-only">Checking your session...</span>
      </main>
    );
  }

  if (!user || profileError) return <HomePage />;
  if (roles.includes("admin")) return <Navigate to="/admin" replace />;
  if (roles.includes("provider")) {
    return <Navigate to="/provider/requests" replace />;
  }
  return <Navigate to="/home" replace />;
}
