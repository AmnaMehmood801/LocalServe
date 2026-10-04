import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { toast } from "../lib/toast";
import { supabase } from "../lib/supabase";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
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
      toast.error("Could not send reset link. Please try again.");
      return;
    }

    setSent(true);
  }

  return (
    <section className="shell-container flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-teal-700">
          LocalServe · Samundri
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Reset your password</h1>

        {sent ? (
          <p className="mt-4 text-sm text-slate-600">
            If an account exists for this email, a reset link has been sent.
            Check your inbox and spam folder.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">
              Enter your email address and we&apos;ll send a password reset
              link.
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
                  Email
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
                {submitting ? "Sending..." : "Send reset link"}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link className="font-medium text-teal-700 underline" to="/login">
            Back to login
          </Link>
        </p>
      </div>
    </section>
  );
}
