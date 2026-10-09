import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "../lib/toast";

import { supabase } from "../lib/supabase";
import { AuthShell } from "../components/auth/AuthShell";

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
    return "/home";
  return value;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    <AuthShell
      title="Sign in to your account"
      subtitle="Welcome back to LocalServe"
    >
      <form
        className="mt-7 space-y-4"
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
            placeholder="you@example.com"
            {...register("email")}
            aria-invalid={Boolean(errors.email)}
            className="min-h-11 w-full rounded-lg border border-slate-400/50 bg-white px-3 outline-none focus:ring-2 focus:ring-[#1DBF73]"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-rose-600">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            htmlFor="login-password"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Your password"
              {...register("password")}
              aria-invalid={Boolean(errors.password)}
              className="min-h-11 w-full rounded-lg border border-slate-400/50 bg-white px-3 pr-12 outline-none focus:ring-2 focus:ring-[#1DBF73]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex min-h-11 min-w-10 items-center justify-center rounded-r-lg text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1DBF73]"
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" size={18} />
              ) : (
                <Eye aria-hidden="true" size={18} />
              )}
            </button>
          </div>
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
          className="min-h-11 w-full rounded-xl bg-[#1DBF73] px-5 font-medium text-white hover:bg-[#19A463] disabled:cursor-wait disabled:opacity-60"
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
    </AuthShell>
  );
}
