import { useEffect, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Settings,
  Tags,
  Users,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { toast } from "../lib/toast";

import { useAuth } from "../app/AuthContext";

const adminNavigation = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard, end: true },
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Providers", path: "/admin/providers", icon: BriefcaseBusiness },
  { label: "Listings", path: "/admin/listings", icon: ClipboardList },
  { label: "Bookings", path: "/admin/bookings", icon: ClipboardList },
  { label: "Reviews", path: "/admin/reviews", icon: MessageSquareText },
  { label: "Cities", path: "/admin/cities", icon: Building2 },
  { label: "Categories", path: "/admin/categories", icon: Tags },
  { label: "Reports", path: "/admin/reports", icon: BarChart3 },
  { label: "Settings", path: "/admin/settings", icon: Settings },
];

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, displayName, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!mobileOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  async function handleSignOut() {
    try {
      await signOut();
      toast.success("You are signed out.");
      navigate("/");
    } catch {
      toast.error("Could not sign out. Please try again.");
    }
  }

  function SidebarNavigation({ mobile = false }: { mobile?: boolean }) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex min-h-[76px] items-center justify-between border-b border-white/10 px-5">
          <Link
            to="/admin"
            onClick={() => setMobileOpen(false)}
            className="rounded-md text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            aria-label="LocalServe admin dashboard"
          >
            <span className="block text-lg font-semibold">LocalServe</span>
            <span className="text-xs text-slate-400">Admin workspace</span>
          </Link>
          {mobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close admin navigation"
              className="grid size-10 place-items-center rounded-lg text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <X size={20} aria-hidden="true" />
            </button>
          )}
        </div>
        <nav
          className="flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto px-3 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Admin navigation"
        >
          {adminNavigation.map(({ label, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex min-h-9 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                  isActive
                    ? "border border-white/10 bg-white/[0.04] text-white"
                    : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                }`
              }
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <Link
            to="/account"
            onClick={() => setMobileOpen(false)}
            className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm text-slate-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-600 font-semibold text-white">
              {(displayName ?? user?.email ?? "A").slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-white">
                {displayName ?? "Admin"}
              </span>
              <span className="block text-xs text-slate-400">Admin</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-slate-300 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <LogOut size={18} aria-hidden="true" />
            Log out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-[#252724] text-ink md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto bg-[#252724] md:block">
        <SidebarNavigation />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close admin navigation"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-navy-950/60"
          />
          <aside className="relative z-10 h-full w-[min(18rem,85vw)] bg-[#252724] shadow-lg">
            <SidebarNavigation mobile />
          </aside>
        </div>
      )}
      <div className="min-h-screen min-w-0 flex-1 overflow-x-clip bg-[#F7F8F7]">
        <header className="sticky top-0 z-30 flex min-h-[76px] items-center justify-between border-b border-cream-100 bg-white px-4 shadow-sm md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open admin navigation"
              aria-expanded={mobileOpen}
              className="grid size-11 place-items-center rounded-xl border border-cream-100 text-ink hover:bg-cream-50 focus:outline-none focus:ring-2 focus:ring-teal-600 md:hidden"
            >
              <Menu size={20} aria-hidden="true" />
            </button>
            <div>
              <p className="text-xs text-slate-600">LocalServe / Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block max-w-48 truncate text-sm font-medium text-ink">
                {displayName ?? user?.email ?? "Admin"}
              </span>
              <span className="text-xs text-slate-600">Admin</span>
            </span>
            <span
              className="grid size-10 place-items-center rounded-full bg-teal-50 font-semibold text-teal-700"
              aria-hidden="true"
            >
              {(displayName ?? user?.email ?? "A").slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main className="mx-auto min-w-0 w-full max-w-[1440px] p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
