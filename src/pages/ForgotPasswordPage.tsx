import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { BackButton } from "../components/ui/BackButton";
import { toast } from "../lib/toast";
import { supabase } from "../lib/supabase";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);

    if (error) {
      toast.error(t("auth.forgot.sendError"));
      return;
    }

    setSent(true);
  }

  return (
    <section className="shell-container flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <BackButton
          fallback="/login"
          label={t("auth.forgot.backToLogin")}
          className="mb-4"
        />
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-teal-700">
            LocalServe · Samundri
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            {t("auth.forgot.title")}
          </h1>

          {sent ? (
            <p className="mt-4 text-sm text-slate-600">
              {t("auth.forgot.sentMessage")}
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-slate-600">
                {t("auth.forgot.instructions")}
              </p>

              <form
                className="mt-7 space-y-5"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
              >
                <div>
                  <label
                    className="mb-1 block text-sm font-medium"
                    htmlFor="forgot-email"
                  >
                    {t("auth.forgot.emailLabel")}
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    {...register("email")}
                    aria-invalid={Boolean(errors.email)}
                    className="min-h-11 w-full rounded-lg border border-slate-400/50 bg-white px-3 outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-rose-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-11 w-full rounded-xl bg-teal-600 px-5 font-medium text-white hover:bg-teal-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {submitting
                    ? t("auth.forgot.submitting")
                    : t("auth.forgot.submit")}
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-slate-600">
            <Link className="font-medium text-teal-700 underline" to="/login">
              {t("auth.forgot.backToLogin")}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
