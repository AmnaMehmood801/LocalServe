import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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
}) {
  const detail = error.message.trim();
  if (error.status === 429 || /too many requests|rate limit/i.test(detail)) {
    return "Supabase is rate-limiting signups. Wait before trying again.";
  }
  if (error.code === "weak_password" || /password/i.test(detail)) {
    return detail;
  }
  if (detail.toLowerCase().includes("database error saving new user")) {
    return "Supabase could not finish account setup. Check the Auth service logs for the database trigger error.";
  }
  return error.status
    ? `Sign-up failed (${error.status}): ${detail}`
    : detail || "Could not create your account. Please try again.";
}

export function RegisterPage() {
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
        const message = getSignupErrorMessage(error);
        setSignupError(message);
        toast.error(message);
        return;
      }
      if (data.session) {
        toast.success("Your account is ready.");
        navigate("/", { replace: true });
      } else {
        setConfirmationEmail(values.email);
      }
    } catch {
      const message =
        "Could not reach Supabase to create your account. Check your connection before retrying.";
      setSignupError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join LocalServe in a minute"
    >
      {confirmationEmail ? (
        <div
          className="mt-7 rounded-xl border border-teal-600/20 bg-teal-50 p-4"
          role="status"
        >
          <h2 className="font-semibold">Check your email</h2>
          <p className="mt-1 text-sm text-slate-600">
            Follow the confirmation link sent to {confirmationEmail} to finish
            creating your account.
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
              Display name
            </label>
            <input
              id="register-name"
              autoComplete="name"
              placeholder="e.g. Ayesha Khan"
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
              Email
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
              Password
            </label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Create a password"
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
              Samundri area
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
                    ariaLabel="Samundri area"
                    placeholder="Select an area"
                    size="md"
                    buttonClassName="!h-10 !min-h-0 !px-3 !py-0 !pr-10 !text-sm disabled:opacity-60"
                  />
                )}
              />
            </fieldset>
            {areasLoading && (
              <p className="mt-1 text-sm text-slate-600" role="status">
                Loading Samundri areas...
              </p>
            )}
            {areasError && (
              <p className="mt-1 text-sm text-rose-600" role="alert">
                {areasError}
              </p>
            )}
            {!areasLoading && !areasError && areas.length === 0 && (
              <p className="mt-1 text-sm text-slate-600" role="status">
                No active Samundri areas are available yet.
              </p>
            )}
            {errors.area_id && (
              <p className="mt-1 text-sm text-rose-600">
                {errors.area_id.message}
              </p>
            )}
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">I want to</legend>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex min-h-11 cursor-pointer items-start gap-2 rounded-lg border border-slate-400/50 px-3 py-2 text-sm has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50">
                <input
                  type="radio"
                  value="customer"
                  {...register("role")}
                  className="mt-0.5 accent-[#1DBF73]"
                />
                <span>
                  Find a service
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Book trusted local help
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
                  Offer services
                  <span className="mt-0.5 block text-xs text-slate-500">
                    List your services and get requests
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
            {submitting ? "Creating account..." : "Sign up"}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link className="font-medium text-teal-700 underline" to="/login">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
