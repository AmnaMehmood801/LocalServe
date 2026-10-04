import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "../lib/toast";
import { z } from "zod";

import { useAuth } from "../app/AuthContext";
import { useAreas } from "../app/AreaContext";
import { supabase } from "../lib/supabase";

const accountSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters.")
    .max(80),
  phone: z.string().trim().max(40, "Phone must be 40 characters or fewer."),
  area_id: z.string().uuid("Choose an active Samundri locality."),
  bio: z.string().trim().max(2000, "Bio must be 2,000 characters or fewer."),
});

type AccountValues = z.infer<typeof accountSchema>;

function getProfileErrorMessage(message: string) {
  if (message.includes("PROFILE_INACTIVE")) {
    return "This account is inactive. Profile changes and marketplace actions are unavailable.";
  }
  if (message.includes("PROFILE_AREA_INVALID")) {
    return "Choose an active Samundri locality.";
  }
  if (message.includes("PROFILE_DISPLAY_NAME_INVALID")) {
    return "Enter a display name between 2 and 80 characters.";
  }
  if (message.includes("PROFILE_PHONE_TOO_LONG")) {
    return "Phone must be 40 characters or fewer.";
  }
  if (message.includes("PROFILE_BIO_TOO_LONG")) {
    return "Bio must be 2,000 characters or fewer.";
  }
  if (message.includes("INVALID_MARKETPLACE_ROLE")) {
    return "Only customer or provider roles can be added.";
  }
  return "We couldn’t complete that account action. Please try again.";
}

export function AccountPage() {
  const {
    user,
    profile,
    profileError,
    roles,
    loading: authLoading,
    refreshIdentity,
  } = useAuth();
  const {
    areas,
    setSelectedAreaId,
    loading: areasLoading,
    error: areasError,
  } = useAreas();
  const [saving, setSaving] = useState(false);
  const [addingProvider, setAddingProvider] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      display_name: "",
      phone: "",
      area_id: "",
      bio: "",
    },
  });

  useEffect(() => {
    if (!profile || areasLoading) return;
    const profileAreaIsActive = areas.some(
      (area) => area.id === profile.area_id,
    );
    reset({
      display_name: profile.display_name,
      phone: profile.phone ?? "",
      area_id: profileAreaIsActive ? profile.area_id : areas[0]?.id || "",
      bio: profile.bio ?? "",
    });
  }, [areas, areasLoading, profile, reset]);

  async function onSubmit(values: AccountValues) {
    if (!user || !profile || !profile.is_active) return;
    setActionError(null);
    setSaving(true);
    const { error } = await supabase.rpc("update_account_profile", {
      p_display_name: values.display_name,
      p_phone: values.phone || null,
      p_area_id: values.area_id,
      p_bio: values.bio || null,
    });
    setSaving(false);
    if (error) {
      const message = getProfileErrorMessage(error.message);
      setActionError(message);
      toast.error(message);
      return;
    }

    setSelectedAreaId(values.area_id);
    try {
      await refreshIdentity();
    } catch {
      setActionError(
        "Your changes were saved, but account details could not refresh.",
      );
    }
    toast.success("Profile updated.");
  }

  async function addProviderRole() {
    setActionError(null);
    setAddingProvider(true);
    const { error } = await supabase.rpc("add_marketplace_role", {
      p_role: "provider",
    });
    setAddingProvider(false);
    if (error) {
      const message = getProfileErrorMessage(error.message);
      setActionError(message);
      toast.error(message);
      return;
    }

    try {
      await refreshIdentity();
      toast.success("Provider services are now enabled for your account.");
    } catch {
      const message =
        "Provider role was added, but account details could not refresh.";
      setActionError(message);
      toast.error(message);
    }
  }

  if (authLoading || (areasLoading && !profile)) {
    return (
      <div className="shell-container py-12" role="status">
        Loading account...
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <section className="shell-container py-12">
        <h1 className="text-3xl font-semibold">Account</h1>
        <p className="mt-3 text-sm text-rose-600" role="alert">
          {profileError ?? "Your profile could not be found."}
        </p>
        <button
          type="button"
          onClick={() => void refreshIdentity()}
          className="mt-4 min-h-11 rounded-xl border border-ink/20 bg-white px-5 text-sm font-medium"
        >
          Retry
        </button>
      </section>
    );
  }

  const inactive = !profile.is_active;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 md:py-10">
      <header className="border-b border-cream-100 pb-5">
        <p className="text-xs font-semibold uppercase text-slate-600">
          Your account
        </p>
        <h1 className="mt-1 text-3xl font-semibold">Profile</h1>
      </header>

      {inactive && (
        <p
          className="mt-5 rounded-xl border border-rose-600/20 bg-white p-4 text-sm text-rose-700"
          role="alert"
        >
          This account is inactive. Profile changes and marketplace actions are
          unavailable.
        </p>
      )}
      {areasError && (
        <p
          className="mt-5 rounded-xl border border-rose-600/20 bg-white p-4 text-sm text-rose-700"
          role="alert"
        >
          {areasError}
        </p>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-6 space-y-5 rounded-xl border border-cream-100 bg-white p-5 shadow-sm md:p-7"
      >
        <div>
          <label
            htmlFor="account-display-name"
            className="mb-1 block text-sm font-medium"
          >
            Display name
          </label>
          <input
            id="account-display-name"
            autoComplete="name"
            {...register("display_name")}
            aria-invalid={Boolean(errors.display_name)}
            className="min-h-11 w-full rounded-lg border border-slate-400/50 px-3 outline-none focus:ring-2 focus:ring-teal-600"
          />
          {errors.display_name && (
            <p className="mt-1 text-sm text-rose-600">
              {errors.display_name.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="account-phone"
            className="mb-1 block text-sm font-medium"
          >
            Phone
          </label>
          <input
            id="account-phone"
            type="tel"
            autoComplete="tel"
            {...register("phone")}
            aria-invalid={Boolean(errors.phone)}
            className="min-h-11 w-full rounded-lg border border-slate-400/50 px-3 outline-none focus:ring-2 focus:ring-teal-600"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-rose-600">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="account-city"
            className="mb-1 block text-sm font-medium"
          >
            City
          </label>
          <input
            id="account-city"
            value="Samundri"
            readOnly
            className="min-h-11 w-full rounded-lg border border-slate-400/50 bg-cream-50 px-3 text-slate-600"
          />
        </div>

        <div>
          <label
            htmlFor="account-area"
            className="mb-1 block text-sm font-medium"
          >
            Samundri locality
          </label>
          <select
            id="account-area"
            {...register("area_id")}
            disabled={areasLoading || areas.length === 0 || inactive}
            aria-invalid={Boolean(errors.area_id)}
            className="min-h-11 w-full rounded-lg border border-slate-400/50 bg-white px-3 outline-none focus:ring-2 focus:ring-teal-600 disabled:opacity-60"
          >
            <option value="">Choose a locality</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
          {errors.area_id && (
            <p className="mt-1 text-sm text-rose-600">
              {errors.area_id.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="account-bio"
            className="mb-1 block text-sm font-medium"
          >
            Bio
          </label>
          <textarea
            id="account-bio"
            rows={4}
            maxLength={2000}
            {...register("bio")}
            aria-invalid={Boolean(errors.bio)}
            className="w-full rounded-lg border border-slate-400/50 px-3 py-2 outline-none focus:ring-2 focus:ring-teal-600"
          />
          {errors.bio && (
            <p className="mt-1 text-sm text-rose-600">{errors.bio.message}</p>
          )}
        </div>

        <dl className="grid gap-3 border-t border-cream-100 pt-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-slate-600">
              Account status
            </dt>
            <dd className="mt-1 text-sm">
              {profile.is_active ? "Active" : "Inactive"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-600">
              Verification
            </dt>
            <dd className="mt-1 text-sm">
              {profile.is_verified ? "Verified" : "Not verified"}
            </dd>
          </div>
        </dl>

        {actionError && (
          <p
            className="rounded-lg bg-rose-600/5 p-3 text-sm text-rose-600"
            role="alert"
          >
            {actionError}
          </p>
        )}
        <button
          type="submit"
          disabled={saving || inactive || areasLoading || areas.length === 0}
          className="min-h-11 w-full rounded-xl bg-teal-600 px-5 font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving profile..." : "Save changes"}
        </button>
      </form>

      {roles.includes("customer") && !roles.includes("provider") && (
        <section className="mt-6 border-t border-cream-100 pt-6">
          <h2 className="text-lg font-semibold">Offer services</h2>
          <p className="mt-1 text-sm text-slate-600">
            Add the provider role to create and manage service listings.
          </p>
          <button
            type="button"
            onClick={() => void addProviderRole()}
            disabled={addingProvider || inactive}
            className="mt-4 min-h-11 rounded-xl border border-ink/20 bg-white px-5 text-sm font-medium hover:bg-cream-50 disabled:opacity-50"
          >
            {addingProvider
              ? "Enabling provider role..."
              : "Also list services"}
          </button>
        </section>
      )}
    </section>
  );
}
