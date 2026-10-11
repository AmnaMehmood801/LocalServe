import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "../lib/toast";

import { useAreas } from "../app/AreaContext";
import { SelectMenu } from "../components/ui/SelectMenu";
import { getAreaGroup } from "../lib/areaGroups";
import { supabase } from "../lib/supabase";
import { AuthShell } from "../components/auth/AuthShell";

const registerSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters.")
    .max(80),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  area_id: z.string().uuid("Choose a Samundri area."),
  role: z.enum(["customer", "provider"]),
});
type RegisterValues = z.infer<typeof registerSchema>;

function getSignupErrorMessage(error: {
  message: string;
  status?: number;
  code?: string;
}, t: TFunction) {
  const detail = error.message.trim();
  if (error.status === 429 || /too many requests|rate limit/i.test(detail)) {
    return t("auth.register.rateLimitError");
  }
  if (error.code === "weak_password" || /password/i.test(detail)) {
    return detail;
  }
  if (detail.toLowerCase().includes("database error saving new user")) {
    return t("auth.register.accountSetupError");
  }
  return error.status
    ? t("auth.register.signupFailed", { status: error.status, detail })
    : detail || t("auth.register.signupErrorFallback");
}

export function RegisterPage() {
  const { t } = useTranslation();
  const {
    areas,
    selectedAreaId,
    loading: areasLoading,
    error: areasError,
  } = useAreas();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      area_id: "",
      role: searchParams.get("role") === "provider" ? "provider" : "customer",
    },
  });

  useEffect(() => {
    if (selectedAreaId) setValue("area_id", selectedAreaId);
  }, [selectedAreaId, setValue]);

  async function onSubmit(values: RegisterValues) {
    setSignupError(null);
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            display_name: values.display_name,
            role: values.role,
            area_id: values.area_id,
          },
        },
      });
      if (error) {
        const message = getSignupErrorMessage(error, t);
        setSignupError(message);
        toast.error(message);
        return;
      }
      if (data.session) {
        toast.success(t("auth.register.accountReady"));
        navigate("/", { replace: true });
      } else {
        setConfirmationEmail(values.email);
      }
    } catch {
      const message =
        t("auth.register.connectionError");
      setSignupError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={t("auth.register.title")}
      subtitle={t("auth.register.subtitle")}
    >
      {confirmationEmail ? (
        <div
          className="mt-7 rounded-xl border border-teal-600/20 bg-teal-50 p-4"
          role="status"
        >
          <h2 className="font-semibold">{t("auth.register.checkEmail")}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {t("auth.register.confirmationMessage", {
              email: confirmationEmail,
            })}
          </p>
        </div>
      ) : (
        <form
          className="mt-7 space-y-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          {signupError && (
            <p
              className="rounded-lg bg-rose-600/5 p-3 text-sm text-rose-600"
              role="alert"
            >
              {signupError}
            </p>
          )}
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              htmlFor="register-name"
            >
              {t("auth.register.displayName")}
            </label>
            <input
              id="register-name"
              autoComplete="name"
              placeholder={t("auth.register.displayNamePlaceholder")}
              {...register("display_name")}
              aria-invalid={Boolean(errors.display_name)}
              className="min-h-11 w-full rounded-lg border border-slate-400/50 bg-white px-3 outline-none focus:ring-2 focus:ring-[#1DBF73]"
            />
            {errors.display_name && (
              <p className="mt-1 text-sm text-rose-600">
                {errors.display_name.message}
              </p>
            )}
          </div>
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              htmlFor="register-email"
            >
              {t("auth.register.emailLabel")}
            </label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register("email")}
              aria-invalid={Boolean(errors.email)}
              className="min-h-11 w-full rounded-lg border border-slate-400/50 bg-white px-3 outline-none focus:ring-2 focus:ring-[#1DBF73]"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-rose-600">
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              htmlFor="register-password"
            >
              {t("auth.register.passwordLabel")}
            </label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder={t("auth.register.passwordPlaceholder")}
                {...register("password")}
                aria-invalid={Boolean(errors.password)}
                className="min-h-11 w-full rounded-lg border border-slate-400/50 bg-white px-3 pe-12 outline-none focus:ring-2 focus:ring-[#1DBF73]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={
                  showPassword
                    ? t("auth.register.hidePassword")
                    : t("auth.register.showPassword")
                }
                className="absolute inset-y-0 end-0 flex min-h-11 min-w-10 items-center justify-center rounded-e-lg text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1DBF73]"
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" size={18} />
                ) : (
                  <Eye aria-hidden="true" size={18} />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-rose-600">
                {errors.password.message}
              </p>
            )}
          </div>
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              htmlFor="register-area"
            >
              {t("auth.register.areaLabel")}
            </label>
            <fieldset
              disabled={areasLoading || areas.length === 0}
              className="m-0 min-w-0 border-0 p-0"
            >
              <Controller
                name="area_id"
                control={control}
                render={({ field }) => (
                  <SelectMenu
                    id="register-area"
                    value={field.value}
                    onChange={field.onChange}
                    options={areas.map((area) => ({
                      value: area.id,
                      label: area.name,
                      group: getAreaGroup(area.slug),
                    }))}
                    ariaLabel={t("auth.register.areaLabel")}
                    placeholder={t("auth.register.areaPlaceholder")}
                    size="md"
                    buttonClassName="!h-10 !min-h-0 !px-3 !py-0 !pe-10 !text-sm disabled:opacity-60"
                  />
                )}
              />
            </fieldset>
            {areasLoading && (
              <p className="mt-1 text-sm text-slate-600" role="status">
                {t("auth.register.loadingAreas")}
              </p>
            )}
            {areasError && (
              <p className="mt-1 text-sm text-rose-600" role="alert">
                {areasError}
              </p>
            )}
            {!areasLoading && !areasError && areas.length === 0 && (
              <p className="mt-1 text-sm text-slate-600" role="status">
                {t("auth.register.noAreas")}
              </p>
            )}
            {errors.area_id && (
              <p className="mt-1 text-sm text-rose-600">
                {errors.area_id.message}
              </p>
            )}
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">
              {t("auth.register.roleLegend")}
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex min-h-11 cursor-pointer items-start gap-2 rounded-lg border border-slate-400/50 px-3 py-2 text-sm has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50">
                <input
                  type="radio"
                  value="customer"
                  {...register("role")}
                  className="mt-0.5 accent-[#1DBF73]"
                />
                <span>
                  {t("auth.register.customerRole")}
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {t("auth.register.customerRoleHelp")}
                  </span>
                </span>
              </label>
              <label className="flex min-h-11 cursor-pointer items-start gap-2 rounded-lg border border-slate-400/50 px-3 py-2 text-sm has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50">
                <input
                  type="radio"
                  value="provider"
                  {...register("role")}
                  className="mt-0.5 accent-[#1DBF73]"
                />
                <span>
                  {t("auth.register.providerRole")}
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {t("auth.register.providerRoleHelp")}
                  </span>
                </span>
              </label>
            </div>
            {errors.role && (
              <p className="mt-1 text-sm text-rose-600">
                {errors.role.message}
              </p>
            )}
          </fieldset>
          <button
            type="submit"
            disabled={submitting || areasLoading || areas.length === 0}
            className="min-h-11 w-full rounded-xl bg-[#1DBF73] px-5 font-medium text-white hover:bg-[#19A463] disabled:cursor-wait disabled:opacity-60"
          >
            {submitting
              ? t("auth.register.submitting")
              : t("auth.register.submit")}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-slate-600">
        {t("auth.register.haveAccount")}{" "}
        <Link className="font-medium text-teal-700 underline" to="/login">
          {t("auth.register.logInLink")}
        </Link>
      </p>
    </AuthShell>
  );
}
