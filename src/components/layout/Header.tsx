import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { toast } from "../../lib/toast";
import { Check, ChevronDown, Menu } from "lucide-react";

import { useAreas } from "../../app/AreaContext";
import { useAuth } from "../../app/AuthContext";
import { getAreaGroup } from "../../lib/areaGroups";
import { supabase } from "../../lib/supabase";
import { Avatar } from "../Avatar";
import { Logo } from "../Logo";
import { AreaSelect } from "./AreaSelect";
import { NotificationBell } from "./NotificationBell";
import { useLanguage } from "../../i18n/useLanguage";

const languageOptions = [
  { value: "en", label: "English" },
  { value: "ur", label: "اردو" },
] as const;

const languageButtonLabels = {
  en: "EN",
  ur: "اردو",
} as const;

export function Header() {
  const { areas, selectedAreaId, setSelectedAreaId, loading, error } =
    useAreas();
  const { user, displayName, roles, loading: authLoading, signOut } = useAuth();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const primaryNavLayout =
    language === "en"
      ? "lg:gap-4 xl:gap-6 xl:-translate-x-8 min-[1400px]:-translate-x-16 2xl:-translate-x-24 max-[1100px]:!gap-0"
      : "lg:gap-0";
  const areaSelectLayout =
    language === "en"
      ? "max-[399px]:max-w-[140px] min-[1024px]:max-[1100px]:max-w-[6rem] min-[1101px]:max-[1279.98px]:max-w-[7rem] xl:max-w-[10rem] min-[1600px]:max-w-[12rem] [&>button]:w-auto [&>button]:max-w-full [&>button]:shrink-0 [&>button]:whitespace-nowrap min-[1024px]:max-[1100px]:[&>button]:!min-w-[6rem] min-[1101px]:max-[1279.98px]:[&>button]:!min-w-[7rem] xl:[&>button]:!min-w-[10rem]"
      : "max-[399px]:max-w-[140px] min-[1024px]:max-[1100px]:!max-w-[3rem] min-[1101px]:max-[1279.98px]:max-w-[7rem] xl:max-w-[8rem] [&>button]:w-auto [&>button]:max-w-full [&>button]:shrink-0 [&>button]:whitespace-nowrap min-[1024px]:max-[1100px]:[&>button]:!min-w-[3rem] min-[1101px]:max-[1279.98px]:[&>button]:!min-w-[7rem] xl:[&>button]:!min-w-[8rem]";
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
    "area" | "language" | "notifications" | "profile" | "mobile" | null
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
    <header ref={headerRef} className="bg-[#252724] text-white">
      <div className="shell-container flex h-16 w-full flex-nowrap items-center gap-1 px-4 min-[400px]:gap-2 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-x-8 xl:max-w-7xl">
        <Link
          to={homePath}
          aria-label="LocalServe home"
          className="flex min-w-0 shrink-0 items-center gap-3 lg:col-start-1 lg:row-start-1"
        >
          <Logo />
          <span className="hidden min-[400px]:inline text-lg font-semibold">
            LocalServe
          </span>
        </Link>

        <nav
          className={`hidden min-w-0 items-center gap-2 lg:col-start-2 lg:row-start-1 lg:flex lg:justify-self-center ${primaryNavLayout}`}
          aria-label="Primary navigation"
        >
          <NavLink
            to={homePath}
            end
            className={({ isActive }) =>
              `relative flex min-h-10 items-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-white ${isActive ? "bg-white/10" : "hover:bg-white/10"}`
            }
          >
            {({ isActive }) => (
              <>
                {t("nav.home")}
                {isActive && (
                  <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[#1DBF73]" />
                )}
              </>
            )}
          </NavLink>
          <Link
            to="/#services"
            className="flex min-h-10 items-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
          >
            {t("nav.ourServices")}
          </Link>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `relative flex min-h-10 items-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-white ${isActive ? "bg-white/10" : "hover:bg-white/10"}`
            }
          >
            {({ isActive }) => (
              <>
                {t("nav.about")}
                {isActive && (
                  <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[#1DBF73]" />
                )}
              </>
            )}
          </NavLink>
          <NavLink
            to="/faq"
            className={({ isActive }) =>
              `relative flex min-h-10 items-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-white ${isActive ? "bg-white/10" : "hover:bg-white/10"}`
            }
          >
            {({ isActive }) => (
              <>
                {t("nav.faq")}
                {isActive && (
                  <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[#1DBF73]" />
                )}
              </>
            )}
          </NavLink>
        </nav>

        <nav
          className={`ml-auto flex shrink-0 items-center gap-1 text-sm min-[400px]:gap-2 lg:col-start-3 lg:row-start-1 lg:ml-0 lg:min-w-0 lg:justify-end lg:justify-self-end lg:whitespace-nowrap ${language === "en" ? "lg:gap-3" : "lg:gap-1"}`}
          aria-label="Main navigation"
        >
          <div className="relative shrink-0" data-header-menu="language">
            <button
              type="button"
              aria-label="Language"
              aria-haspopup="menu"
              aria-expanded={openMenu === "language"}
              onClick={() =>
                setOpenMenu(openMenu === "language" ? null : "language")
              }
              className="flex min-h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              {languageButtonLabels[language]}
              <ChevronDown size={14} aria-hidden="true" />
            </button>
            {openMenu === "language" && (
              <div
                role="menu"
                aria-label="Language"
                className="absolute right-0 z-30 mt-2 w-40 rounded-xl border border-white/20 bg-[#252724] p-1 text-white shadow-lg"
              >
                {languageOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={language === option.value}
                    onClick={() => {
                      setLanguage(option.value);
                      setOpenMenu(null);
                    }}
                    className="flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10"
                  >
                    {option.label}
                    {language === option.value && (
                      <Check size={16} aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
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
              className={`${areaSelectLayout} max-[399px]:[&>button]:px-2 max-[399px]:[&>button]:pr-2 [&_[role=listbox]]:!border-white/20 [&_[role=listbox]]:!bg-[#252724] [&_[role=listbox]_button]:!bg-transparent [&_[role=listbox]_button]:!text-white [&_[role=listbox]_button:hover]:!bg-white/10 [&_[role=listbox]_button[aria-selected=true]]:!bg-[#1F6F4F] [&_[role=listbox]_button_span]:!text-white ${loading || areas.length === 0 ? "opacity-60" : ""}`}
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
                  className={`min-h-11 shrink-0 whitespace-nowrap rounded-xl px-3 py-2.5 text-white hover:bg-white/10 ${language === "en" ? "" : "max-[1100px]:!px-1"}`}
                >
                  {t("nav.logIn")}
                </Link>
                <Link
                  to="/register"
                  className={`min-h-11 shrink-0 whitespace-nowrap rounded-lg bg-[#1DBF73] px-4 py-2.5 font-bold text-white hover:bg-[#19A463] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DBF73] ${language === "en" ? "" : "max-[1100px]:!px-1"}`}
                >
                  {t("nav.signUp")}
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
                className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-white/20 bg-[#252724] p-2 text-white shadow-lg"
              >
                <NavLink
                  to={homePath}
                  end
                  className={({ isActive }) =>
                    `relative block rounded-lg px-3 py-2 text-sm ${isActive ? "bg-white/10 font-medium" : "hover:bg-white/10"}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {t("nav.home")}
                      {isActive && (
                        <span className="absolute right-3 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-[#1DBF73]" />
                      )}
                    </>
                  )}
                </NavLink>
                <Link
                  to="/#services"
                  className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10"
                >
                  {t("nav.ourServices")}
                </Link>
                <NavLink
                  to="/about"
                  className={({ isActive }) =>
                    `relative block rounded-lg px-3 py-2 text-sm ${isActive ? "bg-white/10 font-medium" : "hover:bg-white/10"}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {t("nav.about")}
                      {isActive && (
                        <span className="absolute right-3 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-[#1DBF73]" />
                      )}
                    </>
                  )}
                </NavLink>
                <NavLink
                  to="/faq"
                  className={({ isActive }) =>
                    `relative block rounded-lg px-3 py-2 text-sm ${isActive ? "bg-white/10 font-medium" : "hover:bg-white/10"}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {t("nav.faq")}
                      {isActive && (
                        <span className="absolute right-3 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-[#1DBF73]" />
                      )}
                    </>
                  )}
                </NavLink>
                <div className="mt-1 border-t border-white/20 px-3 pt-2">
                  <p className="mb-1 text-xs font-medium text-white">
                    Language
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {languageOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={language === option.value}
                        onClick={() => {
                          setLanguage(option.value);
                          setOpenMenu(null);
                        }}
                        className={`min-h-9 rounded-lg px-2 text-xs ${language === option.value ? "bg-[#1F6F4F] font-semibold text-white" : "text-white hover:bg-white/10"}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                {user ? (
                  <>
                    <p className="truncate px-3 py-2 text-xs text-white">
                      {displayName ?? user.email}
                    </p>
                    {roles.length > 0 && (
                      <p className="px-3 pb-2 text-xs capitalize text-white">
                        {roles.join(" · ")}
                      </p>
                    )}
                    <Link
                      to="/account"
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10"
                    >
                      Account
                    </Link>
                    {roles.includes("customer") && (
                      <Link
                        to="/bookings"
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10"
                      >
                        My bookings
                      </Link>
                    )}
                    {roles.includes("provider") && (
                      <>
                        <Link
                          to="/provider"
                          className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10"
                        >
                          Provider hub
                        </Link>
                        <Link
                          to="/provider/listings"
                          className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10"
                        >
                          My listings
                        </Link>
                        <Link
                          to="/provider/requests"
                          className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10"
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
                      className="mt-1 min-h-10 w-full rounded-lg px-3 text-left text-sm text-white hover:bg-white/10"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10"
                      to="/login"
                    >
                      {t("nav.logIn")}
                    </Link>
                    <Link
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10"
                      to="/register"
                    >
                      {t("nav.signUp")}
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
