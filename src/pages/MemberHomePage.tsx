import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";

import { useAuth } from "../app/AuthContext";
import { Avatar } from "../components/Avatar";
import { supabase } from "../lib/supabase";

type MemberHomeSectionProps = {
  avatarPath: string | null;
  displayName: string;
};

function WelcomeBand({ avatarPath, displayName }: MemberHomeSectionProps) {
  return (
    <div className="flex flex-col items-center gap-4 bg-[#E3F7EC] px-6 py-8 text-center sm:flex-row sm:text-left">
      <Avatar avatarPath={avatarPath} name={displayName} size={80} />
      <h1 className="text-2xl font-semibold text-[#404145]">
        Welcome back, {displayName}
      </h1>
    </div>
  );
}

function CustomerHome({ avatarPath, displayName }: MemberHomeSectionProps) {
  return (
    <main className="shell-container py-8">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <WelcomeBand avatarPath={avatarPath} displayName={displayName} />
        <div className="p-6">
          <Link
            to="/search"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1DBF73] px-5 text-sm font-semibold text-white transition hover:bg-[#19A463] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1DBF73]/25"
          >
            Search services
          </Link>
        </div>
      </section>
    </main>
  );
}

function ProviderHome({ avatarPath, displayName }: MemberHomeSectionProps) {
  return (
    <main className="shell-container py-8">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <WelcomeBand avatarPath={avatarPath} displayName={displayName} />
        <div className="p-6">
          <Link
            to="/provider"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1DBF73] px-5 text-sm font-semibold text-white transition hover:bg-[#19A463] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1DBF73]/25"
          >
            Provider workspace
          </Link>
        </div>
      </section>
    </main>
  );
}

export function MemberHomePage() {
  const { user, profile, displayName, roles, loading } = useAuth();
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

  if (loading) {
    return (
      <main className="shell-container py-8" role="status">
        <div className="h-36 animate-pulse rounded-2xl bg-slate-100 motion-reduce:animate-none" />
        <span className="sr-only">Loading your home...</span>
      </main>
    );
  }

  if (roles.includes("admin")) return <Navigate to="/admin" replace />;

  const name =
    displayName?.trim() || profile?.display_name?.trim() || "Member";
  const memberProps = { avatarPath, displayName: name };

  return roles.includes("provider") ? (
    <ProviderHome {...memberProps} />
  ) : (
    <CustomerHome {...memberProps} />
  );
}
