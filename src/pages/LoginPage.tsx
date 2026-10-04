import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "../lib/toast";

import { supabase } from "../lib/supabase";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
type LoginValues = z.infer<typeof loginSchema>;

function getSafeNext(value: string | null) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  )
    return "/";
  return value;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(values);
    setSubmitting(false);
    if (error) {
      toast.error("Could not sign in. Check your email and password.");
      return;
    }
    toast.success("Welcome back.");
    navigate(getSafeNext(new URLSearchParams(location.search).get("next")), {
      replace: true,
    });
  }

  return (
    <section className="shell-container flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-teal-700">
          LocalServe · Samundri
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Log in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to continue to your account.
        </p>
        <form
          className="mt-7 space-y-5"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              htmlFor="login-email"
            >
              Email
            </label>
            <input
              id="login-email"
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
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              htmlFor="login-password"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
              aria-invalid={Boolean(errors.password)}
              className="min-h-11 w-full rounded-lg border border-slate-400/50 bg-white px-3 outline-none focus:ring-2 focus:ring-teal-600"
            />
            <div className="mt-2 flex justify-end">
              <Link
                className="text-sm font-medium underline"
                style={{ color: "#168A55" }}
                to="/forgot-password"
              >
                Forgot password?
              </Link>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-rose-600">
                {errors.password.message}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 w-full rounded-xl bg-teal-600 px-5 font-medium text-white hover:bg-teal-700 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Log in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          New to LocalServe?{" "}
          <Link className="font-medium text-teal-700 underline" to="/register">
            Create an account
          </Link>
        </p>
      </div>
    </section>
  );
}
