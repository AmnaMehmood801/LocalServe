import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Controller, useForm } from "react-hook-form";
import { toast } from "../lib/toast";
import { z } from "zod";

import { useAuth } from "../app/AuthContext";
import { useAreas } from "../app/AreaContext";
import { Avatar } from "../components/Avatar";
import { BackButton } from "../components/ui/BackButton";
import { CoverCropper } from "../components/ui/CoverCropper";
import { SelectMenu } from "../components/ui/SelectMenu";
import { getAreaGroup } from "../lib/areaGroups";
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

function getProfileErrorMessage(message: string, t: TFunction) {
  if (message.includes("PROFILE_INACTIVE")) {
    return t("account.errors.inactive");
  }
  if (message.includes("PROFILE_AREA_INVALID")) {
    return t("account.errors.invalidArea");
  }
  if (message.includes("PROFILE_DISPLAY_NAME_INVALID")) {
    return t("account.errors.invalidDisplayName");
  }
  if (message.includes("PROFILE_PHONE_TOO_LONG")) {
    return t("account.errors.phoneTooLong");
  }
  if (message.includes("PROFILE_BIO_TOO_LONG")) {
    return t("account.errors.bioTooLong");
  }
  if (message.includes("INVALID_MARKETPLACE_ROLE")) {
    return t("account.errors.invalidRole");
  }
  return t("account.errors.actionFailed");
}

export function AccountPage() {
  const { t } = useTranslation();
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
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [addingProvider, setAddingProvider] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    control,
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
      const message = getProfileErrorMessage(error.message, t);
      setActionError(message);
      toast.error(message);
      return;
    }

    setSelectedAreaId(values.area_id);
    try {
      await refreshIdentity();
    } catch {
      setActionError(
        t("account.refreshAfterSaveError"),
      );
    }
    toast.success(t("account.profileUpdated"));
  }

  async function addProviderRole() {
    setActionError(null);
    setAddingProvider(true);
    const { error } = await supabase.rpc("add_marketplace_role", {
      p_role: "provider",
    });
    setAddingProvider(false);
    if (error) {
      const message = getProfileErrorMessage(error.message, t);
      setActionError(message);
      toast.error(message);
      return;
    }

    try {
      await refreshIdentity();
      toast.success(t("account.providerEnabled"));
    } catch {
      const message = t("account.providerRefreshError");
      setActionError(message);
      toast.error(message);
    }
  }

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error(t("account.invalidPhotoType"));
      return;
    }
    setPendingAvatarFile(file);
  }

  async function uploadAvatar(file: File) {
    if (!user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("account.photoTooLarge"));
      setPendingAvatarFile(null);
      return;
    }

    setAvatarBusy(true);
    const path = `${user.id}/avatar-${crypto.randomUUID()}.jpg`;
    try {
      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(path, file, { contentType: "image/jpeg", upsert: false });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase.rpc("set_my_avatar", {
        p_path: path,
      });
      if (updateError) {
        await supabase.storage.from("profile-images").remove([path]);
        throw updateError;
      }

      queryClient.setQueryData(["profile-avatar", user.id], path);
      await queryClient.invalidateQueries({
        queryKey: ["profile-avatar", user.id],
      });
      toast.success(t("account.photoUpdated"));
    } catch {
      toast.error(t("account.photoUpdateError"));
    } finally {
      setAvatarBusy(false);
      setPendingAvatarFile(null);
    }
  }

  async function removeAvatar() {
    if (!user || !avatarPath) return;
    setAvatarBusy(true);
    const oldPath = avatarPath;
    try {
      const { error } = await supabase.rpc("set_my_avatar", { p_path: null });
      if (error) throw error;
      queryClient.setQueryData(["profile-avatar", user.id], null);
      try {
        await supabase.storage.from("profile-images").remove([oldPath]);
      } catch {}
      await queryClient.invalidateQueries({
        queryKey: ["profile-avatar", user.id],
      });
      toast.success(t("account.photoRemoved"));
    } catch {
      toast.error(t("account.photoRemoveError"));
    } finally {
      setAvatarBusy(false);
    }
  }

  if (authLoading || (areasLoading && !profile)) {
    return (
      <div className="shell-container py-12" role="status">
        <BackButton fallback="/" label={t("account.back")} className="mb-4" />
        {t("account.loading")}
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <section className="shell-container py-12">
        <BackButton fallback="/" label={t("account.back")} className="mb-4" />
        <h1 className="text-3xl font-semibold">{t("account.title")}</h1>
        <p className="mt-3 text-sm text-rose-600" role="alert">
          {profileError ?? t("account.profileNotFound")}
        </p>
        <button
          type="button"
          onClick={() => void refreshIdentity()}
          className="mt-4 min-h-11 rounded-xl border border-ink/20 bg-white px-5 text-sm font-medium"
        >
          {t("account.retry")}
        </button>
      </section>
    );
  }

  const inactive = !profile.is_active;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 md:py-10">
      <BackButton fallback="/" label={t("account.back")} className="mb-4" />
      <header className="border-b border-cream-100 pb-5">
        <p className="text-xs font-semibold uppercase text-slate-600">
          {t("account.yourAccount")}
        </p>
        <h1 className="mt-1 text-3xl font-semibold">{t("account.profile")}</h1>
      </header>

      {inactive && (
        <p
          className="mt-5 rounded-xl border border-rose-600/20 bg-white p-4 text-sm text-rose-700"
          role="alert"
        >
          {t("account.errors.inactive")}
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
        <div className="flex flex-wrap items-center gap-4 border-b border-cream-100 pb-5">
          <Avatar
            avatarPath={avatarPath}
            name={profile.display_name || user?.email || t("account.title")}
            size={80}
          />
          <div className="min-w-0">
            <p className="mb-2 text-sm font-medium">{t("account.profilePhoto")}</p>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFileChange}
              className="sr-only"
              aria-label={t("account.chooseProfilePhoto")}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarBusy || inactive}
                className="h-10 rounded-lg border border-slate-400/50 px-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                {t("account.uploadPhoto")}
              </button>
              {avatarPath && (
                <button
                  type="button"
                  onClick={() => void removeAvatar()}
                  disabled={avatarBusy || inactive}
                  className="h-10 rounded-lg border border-slate-400/50 px-3 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  {t("account.removePhoto")}
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="account-display-name"
            className="mb-1 block text-sm font-medium"
          >
            {t("account.displayName")}{" "}
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="account-display-name"
            autoComplete="name"
            {...register("display_name")}
            aria-invalid={Boolean(errors.display_name)}
            className="h-10 w-full rounded-lg border border-slate-400/50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-600"
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
            {t("account.phone")}
          </label>
          <input
            id="account-phone"
            type="tel"
            autoComplete="tel"
            {...register("phone")}
            aria-invalid={Boolean(errors.phone)}
            className="h-10 w-full rounded-lg border border-slate-400/50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-600"
          />
          <p className="mt-1 text-xs text-slate-500">
            {t("account.phonePrivacyHelp")}
          </p>
          {errors.phone && (
            <p className="mt-1 text-sm text-rose-600">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="account-city"
            className="mb-1 block text-sm font-medium"
          >
            {t("account.city")}
          </label>
          <input
            id="account-city"
            value="Samundri"
            readOnly
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            {t("account.cityAvailabilityHelp")}
          </p>
        </div>

        <div>
          <label
            htmlFor="account-area"
            className="mb-1 block text-sm font-medium"
          >
            {t("account.locality")}{" "}
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <fieldset
            disabled={areasLoading || areas.length === 0 || inactive}
            className="m-0 min-w-0 border-0 p-0"
          >
            <Controller
              name="area_id"
              control={control}
              render={({ field }) => (
                <SelectMenu
                  id="account-area"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={areas.map((area) => ({
                    value: area.id,
                    label: area.name,
                    group: getAreaGroup(area.slug),
                  }))}
                  ariaLabel={t("account.locality")}
                  placeholder={t("account.localityPlaceholder")}
                  size="sm"
                  buttonClassName="disabled:opacity-60"
                />
              )}
            />
          </fieldset>
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
            {t("account.bio")}
          </label>
          <textarea
            id="account-bio"
            rows={4}
            maxLength={2000}
            {...register("bio")}
            aria-invalid={Boolean(errors.bio)}
            className="w-full rounded-lg border border-slate-400/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600"
          />
          <p className="mt-1 text-xs text-slate-500">
            {t("account.bioHelp")}
          </p>
          {errors.bio && (
            <p className="mt-1 text-sm text-rose-600">{errors.bio.message}</p>
          )}
        </div>

        <dl className="grid gap-3 border-t border-cream-100 pt-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-slate-600">
              {t("account.status")}
            </dt>
            <dd className="mt-1">
              <span
                className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-medium ${
                  profile.is_active
                    ? "bg-[#E3F7EC] text-[#168A55]"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {profile.is_active
                  ? t("account.active")
                  : t("account.inactive")}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-600">
              {t("account.verification")}
            </dt>
            <dd className="mt-1">
              <span
                className={`inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium ${
                  profile.is_verified
                    ? "bg-[#E3F7EC] text-[#168A55]"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {profile.is_verified && <Check size={14} aria-hidden="true" />}
                {profile.is_verified
                  ? t("account.verified")
                  : t("account.notVerified")}
              </span>
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
          {saving ? t("account.saving") : t("account.saveChanges")}
        </button>
      </form>

      {pendingAvatarFile && (
        <CoverCropper
          file={pendingAvatarFile}
          aspect={1}
          outputSize={{ width: 512, height: 512 }}
          title={t("account.adjustProfilePhoto")}
          onCancel={() => setPendingAvatarFile(null)}
          onDone={(file) => void uploadAvatar(file)}
        />
      )}

      {roles.includes("customer") && !roles.includes("provider") && (
        <section className="mt-6 border-t border-cream-100 pt-6">
          <h2 className="text-lg font-semibold">{t("account.offerServices")}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {t("account.offerServicesHelp")}
          </p>
          <button
            type="button"
            onClick={() => void addProviderRole()}
            disabled={addingProvider || inactive}
            className="mt-4 min-h-11 rounded-xl border border-ink/20 bg-white px-5 text-sm font-medium hover:bg-cream-50 disabled:opacity-50"
          >
            {addingProvider
              ? t("account.enablingProvider")
              : t("account.alsoListServices")}
          </button>
        </section>
      )}
    </section>
  );
}
