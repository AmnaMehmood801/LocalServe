import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";

export type AuthProfile = {
  id: string;
  display_name: string;
  phone: string | null;
  city_id: string;
  area_id: string;
  bio: string | null;
  is_verified: boolean;
  is_active: boolean;
};

type AuthState = {
  user: User | null;
  profile: AuthProfile | null;
  profileError: string | null;
  displayName: string | null;
  roles: string[];
  loading: boolean;
  refreshIdentity: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession(session: Session | null) {
      const nextUser = session?.user ?? null;
      if (!nextUser) {
        if (mounted) {
          setUser(null);
          setProfile(null);
          setProfileError(null);
          setDisplayName(null);
          setRoles([]);
          setLoading(false);
        }
        return;
      }

      if (mounted) {
        setUser(nextUser);
        setLoading(true);
        setProfileError(null);
        setDisplayName(
          (nextUser.user_metadata.display_name as string | undefined) ?? null,
        );
      }

      const [profileResult, rolesResult] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, display_name, phone, city_id, area_id, bio, is_verified, is_active",
          )
          .eq("id", nextUser.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", nextUser.id),
      ]);

      if (mounted) {
        setProfile(profileResult.data as AuthProfile | null);
        setProfileError(
          profileResult.error || rolesResult.error
            ? "Could not load all account details. Try refreshing your session."
            : null,
        );
        setDisplayName(
          profileResult.data?.display_name ??
            (nextUser.user_metadata.display_name as string | undefined) ??
            null,
        );
        setRoles(rolesResult.data?.map((row) => row.role) ?? []);
        setLoading(false);
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        queueMicrotask(() => void loadSession(session));
      },
    );

    void supabase.auth
      .getSession()
      .then(({ data }) => loadSession(data.session));

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function refreshIdentity() {
    if (!user) return;
    const [profileResult, rolesResult] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, display_name, phone, city_id, area_id, bio, is_verified, is_active",
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    if (profileResult.error || rolesResult.error) {
      setProfileError("Could not refresh your account details. Please retry.");
      throw profileResult.error ?? rolesResult.error;
    }
    const nextProfile = profileResult.data as AuthProfile | null;
    setProfile(nextProfile);
    setProfileError(null);
    setDisplayName(nextProfile?.display_name ?? null);
    setRoles(rolesResult.data?.map((row) => row.role) ?? []);
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        profileError,
        displayName,
        roles,
        loading,
        refreshIdentity,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
