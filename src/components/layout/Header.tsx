import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { toast } from "../../lib/toast";
import { Menu } from "lucide-react";

import { useAreas } from "../../app/AreaContext";
import { useAuth } from "../../app/AuthContext";
import { getAreaGroup } from "../../lib/areaGroups";
import { supabase } from "../../lib/supabase";
import { Avatar } from "../Avatar";
import { Logo } from "../Logo";
import { AreaSelect } from "./AreaSelect";
import { NotificationBell } from "./NotificationBell";

export function Header() {
  const { areas, selectedAreaId, setSelectedAreaId, loading, error } =
    useAreas();
  const { user, displayName, roles, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const homePath =
    !user || authLoading
      ? "/"
      : roles.includes("admin")
        ? "/admin"
        : roles.includes("provider")
          ? "/provider/requests"
          : "/home";
  const headerRef = useRef<HTMLElement>(null);
  const [openMenu, setOpenMenu] = useState<
    "area" | "notifications" | "profile" | "mobile" | null
  >(null);
  const { data: avatarPath = null } = useQuery({
    queryKey: ["profile-avatar", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_path")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.avatar_path ?? null;
    },
  });

  useEffect(() => {
    if (!openMenu) return;

    function handlePointerDown(event: PointerEvent) {
      const activeMenu = headerRef.current?.querySelector(
        `[data-header-menu="${openMenu}"]`,
      );
      if (!activeMenu?.contains(event.target as Node)) setOpenMenu(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenu(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenu]);

  useEffect(() => {
    setOpenMenu(null);
  }, [location.key]);

  async function handleSignOut() {
    try {
      await signOut();
      toast.success("You are signed out.");
      navigate("/");
    } catch {
      toast.error("Could not sign out. Please try again.");
    }
  }

  return (
    <header ref={headerRef} className="bg-[#404145] text-white">
      <div className="shell-container flex h-16 w-full flex-nowrap items-center gap-2 px-4">
        <Link
          to={homePath}
          aria-label="LocalServe home"
          className="flex min-w-0 shrink-0 items-center gap-3"
        >
          <Logo />
          <span className="hidden min-[400px]:inline text-lg font-semibold">
            LocalServe
          </span>
        </Link>

        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Primary navigation"
        >
          <NavLink
            to={homePath}
            end
            className={({ isActive }) =>
              `relative flex min-h-10 items-center rounded-lg px-3 py-2 text-sm font-medium text-white ${isActive ? "bg-white/10" : "hover:bg-white/10"}`
            }
          >
            {({ isActive }) => (
              <>
                Home
                {isActive && (
                  <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[#1DBF73]" />
                )}
              </>
            )}
          </NavLink>
          <NavLink
            to="/search"
            className={({ isActive }) =>
              `relative flex min-h-10 items-center rounded-lg px-3 py-2 text-sm font-medium text-white ${isActive ? "bg-white/10" : "hover:bg-white/10"}`
            }
          >
            {({ isActive }) => (
              <>
                Find services
                {isActive && (
                  <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[#1DBF73]" />
                )}
              </>
            )}
          </NavLink>
          {roles.includes("provider") && (
            <NavLink
              to="/provider/requests"
              className={({ isActive }) =>
                `relative flex min-h-10 items-center rounded-lg px-3 py-2 text-sm font-medium text-white ${isActive ? "bg-white/10" : "hover:bg-white/10"}`
              }
            >
              {({ isActive }) => (
                <>
                  Requests
                  {isActive && (
                    <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[#1DBF73]" />
                  )}
                </>
              )}
            </NavLink>
          )}
        </nav>

        <nav
          className="ml-auto flex items-center gap-2 shrink-0 text-sm"
          aria-label="Main navigation"
        >
          <div className="relative shrink-0" data-header-menu="area">
            <AreaSelect
              value={selectedAreaId}
              onChange={(nextValue) => {
                setSelectedAreaId(nextValue);
                setOpenMenu(null);
              }}
              options={areas.map((area) => ({
                value: area.id,
                label: area.name,
                group: getAreaGroup(area.slug),
              }))}
              className={loading || areas.length === 0 ? "opacity-60" : ""}
            />
          </div>
          {error && (
            <span id="header-area-error" className="sr-only" role="status">
              {error}
            </span>
          )}

          {!authLoading && user && (
            <NotificationBell
              open={openMenu === "notifications"}
              onOpenChange={(open) =>
                setOpenMenu(open ? "notifications" : null)
              }
              onItemClick={() => setOpenMenu(null)}
            />
          )}

          <div className="hidden items-center gap-3 lg:flex">
            {authLoading ? (
              <span className="text-slate-400" role="status">
                Checking session...
              </span>
            ) : user ? (
              <div className="relative" data-header-menu="profile">
                <button
                  type="button"
                  aria-label={`${displayName ?? user.email ?? "Account"} menu`}
                  aria-expanded={openMenu === "profile"}
                  onClick={() =>
                    setOpenMenu(openMenu === "profile" ? null : "profile")
                  }
                  className="grid size-10 cursor-pointer place-items-center rounded-full hover:bg-white/10"
                >
                  <Avatar
                    avatarPath={avatarPath}
                    name={displayName ?? user.email ?? "Account"}
                    size={36}
                  />
                </button>
                {openMenu === "profile" && (
                  <div
                    onClick={() => setOpenMenu(null)}
                    className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-cream-100 bg-white p-2 text-ink shadow-lg"
                  >
                    <p className="truncate px-3 py-2 text-xs text-slate-600">
                      {user.email}
                    </p>
                    {roles.length > 0 && (
                      <p className="px-3 pb-2 text-xs capitalize text-slate-600">
                        {roles.join(" · ")}
                      </p>
                    )}
                    <Link
                      to="/account"
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-cream-50"
                    >
                      Account
                    </Link>
                    {roles.includes("customer") && (
                      <Link
                        to="/bookings"
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-cream-50"
                      >
                        My bookings
                      </Link>
                    )}
                    {roles.includes("provider") && (
                      <>
                        <Link
                          to="/provider"
                          className="block rounded-lg px-3 py-2 text-sm hover:bg-cream-50"
                        >
                          Provider hub
                        </Link>
                        <Link
                          to="/provider/listings"
                          className="block rounded-lg px-3 py-2 text-sm hover:bg-cream-50"
                        >
                          My listings
                        </Link>
                        <Link
                          to="/provider/requests"
                          className="block rounded-lg px-3 py-2 text-sm hover:bg-cream-50"
                        >
                          Requests
                        </Link>
                      </>
                    )}
                    {roles.includes("admin") && (
                      <Link
                        to="/admin"
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-cream-50"
                      >
                        Admin
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="mt-1 min-h-10 w-full rounded-lg px-3 text-left text-sm text-rose-600 hover:bg-cream-50"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="min-h-11 rounded-xl px-3 py-2.5 text-white hover:bg-white/10"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="min-h-11 rounded-lg bg-[#1DBF73] px-4 py-2.5 font-bold text-white hover:bg-[#19A463] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DBF73]"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
          <div
            className="relative shrink-0 lg:hidden"
            data-header-menu="mobile"
          >
            <button
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={openMenu === "mobile"}
              onClick={() =>
                setOpenMenu(openMenu === "mobile" ? null : "mobile")
              }
              className="grid h-10 w-10 shrink-0 cursor-pointer list-none place-items-center rounded-xl border border-white/20 hover:bg-white/10"
            >
              <Menu size={20} aria-hidden="true" />
            </button>
            {openMenu === "mobile" && (
              <div
                onClick={() => setOpenMenu(null)}
                className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-cream-100 bg-white p-2 text-ink shadow-lg"
              >
                <Link
                  to={homePath}
                  className="block rounded-lg px-3 py-2 text-sm hover:bg-cream-50"
                >
                  Home
                </Link>
                <Link
                  to="/search"
                  className="block rounded-lg px-3 py-2 text-sm hover:bg-cream-50"
                >
                  Find services
                </Link>
                {user ? (
                  <>
                    <p className="truncate px-3 py-2 text-xs text-slate-600">
                      {displayName ?? user.email}
                    </p>
                    {roles.length > 0 && (
                      <p className="px-3 pb-2 text-xs capitalize text-slate-600">
                        {roles.join(" · ")}
                      </p>
                    )}
                    <Link
                      to="/account"
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-cream-50"
                    >
                      Account
                    </Link>
                    {roles.includes("customer") && (
                      <Link
                        to="/bookings"
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-cream-50"
                      >
                        My bookings
                      </Link>
                    )}
                    {roles.includes("provider") && (
                      <>
                        <Link
                          to="/provider"
                          className="block rounded-lg px-3 py-2 text-sm hover:bg-cream-50"
                        >
                          Provider hub
                        </Link>
                        <Link
                          to="/provider/listings"
                          className="block rounded-lg px-3 py-2 text-sm hover:bg-cream-50"
                        >
                          My listings
                        </Link>
                        <Link
                          to="/provider/requests"
                          className="block rounded-lg px-3 py-2 text-sm hover:bg-cream-50"
                        >
                          Requests
                        </Link>
                      </>
                    )}
                    {roles.includes("admin") && (
                      <Link
                        to="/admin"
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-cream-50"
                      >
                        Admin
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="mt-1 min-h-10 w-full rounded-lg px-3 text-left text-sm text-rose-600 hover:bg-cream-50"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-cream-50"
                      to="/login"
                    >
                      Log in
                    </Link>
                    <Link
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-cream-50"
                      to="/register"
                    >
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
