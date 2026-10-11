import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Session } from "@supabase/supabase-js";

import { BackButton } from "../components/ui/BackButton";
import { toast } from "../lib/toast";
import { supabase } from "../lib/supabase";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters long."),
    confirmPassword: z
      .string()
      .min(8, "Confirm password must be at least 8 characters long."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    let mounted = true;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;
        if (event === "PASSWORD_RECOVERY") {
          setSession(currentSession);
        }
        setCheckingSession(false);
      },
    );

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setCheckingSession(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(values: ResetPasswordValues) {
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      toast.error(error.message || t("auth.reset.updateError"));
      return;
    }

    toast.success(t("auth.reset.updateSuccess"));
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  if (checkingSession) {
    return (
      <section className="shell-container flex min-h-[70vh] items-center justify-center py-12">
        <div className="w-full max-w-md">
          <BackButton
            fallback="/login"
            label={t("auth.reset.backToLogin")}
            className="mb-4"
          />
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <div className="space-y-4 animate-pulse" aria-live="polite">
              <div className="h-4 w-28 rounded bg-slate-200" />
              <div className="h-8 w-40 rounded bg-slate-200" />
              <div className="h-11 w-full rounded-lg bg-slate-200" />
              <div className="h-11 w-full rounded-lg bg-slate-200" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="shell-container flex min-h-[70vh] items-center justify-center py-12">
        <div className="w-full max-w-md">
          <BackButton
            fallback="/login"
            label={t("auth.reset.backToLogin")}
            className="mb-4"
          />
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold text-teal-700">
              LocalServe · Samundri
            </p>
            <h1 className="mt-2 text-2xl font-semibold">
              {t("auth.reset.resetTitle")}
            </h1>
            <p className="mt-4 text-sm text-slate-600">
              {t("auth.reset.invalidLink")}
            </p>
            <p className="mt-6 text-center text-sm text-slate-600">
              <Link
                className="font-medium text-teal-700 underline"
                to="/forgot-password"
              >
                {t("auth.reset.requestNewLink")}
              </Link>
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="shell-container flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <BackButton
          fallback="/login"
          label={t("auth.reset.backToLogin")}
          className="mb-4"
        />
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-teal-700">
            LocalServe · Samundri
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            {t("auth.reset.createTitle")}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {t("auth.reset.instructions")}
          </p>

          <form
            className="mt-7 space-y-5"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <div>
              <label
                className="mb-1 block text-sm font-medium"
                htmlFor="reset-password"
              >
                {t("auth.reset.newPasswordLabel")}
              </label>
              <input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                {...register("password")}
                aria-invalid={Boolean(errors.password)}
                className="min-h-11 w-full rounded-lg border border-slate-400/50 bg-white px-3 outline-none focus:ring-2 focus:ring-teal-600"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-rose-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label
                className="mb-1 block text-sm font-medium"
                htmlFor="confirm-reset-password"
              >
                {t("auth.reset.confirmPasswordLabel")}
              </label>
              <input
                id="confirm-reset-password"
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword")}
                aria-invalid={Boolean(errors.confirmPassword)}
                className="min-h-11 w-full rounded-lg border border-slate-400/50 bg-white px-3 outline-none focus:ring-2 focus:ring-teal-600"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-rose-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="min-h-11 w-full rounded-xl bg-teal-600 px-5 font-medium text-white hover:bg-teal-700"
            >
              {t("auth.reset.submit")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            <Link className="font-medium text-teal-700 underline" to="/login">
              {t("auth.reset.backToLogin")}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
