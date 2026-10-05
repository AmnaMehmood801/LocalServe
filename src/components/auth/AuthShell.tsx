import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Logo } from "../Logo";

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

const highlights = [
  "Verified local providers",
  "Simple booking requests",
  "Reviews from real customers",
];

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <section className="shell-container flex min-h-[70vh] items-center justify-center py-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl lg:min-h-[600px] lg:grid-cols-2">
        <aside className="relative hidden flex-col overflow-hidden bg-gradient-to-br from-[#404145] to-[#19A463] p-10 text-white lg:flex xl:p-12">
          <img
            src="/auth-side.jpg"
            alt=""
            aria-hidden="true"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            className="absolute inset-0 h-full w-full object-cover object-[center_25%]"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#404145]/75 to-[#19A463]/70" />
          <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#14301f]/80 to-transparent" />
          <div className="relative z-10 flex h-full flex-col">
            <Logo />
            <div className="my-auto">
              <h2 className="max-w-sm text-3xl font-semibold leading-tight">
                Find trusted help in Samundri
              </h2>
              <ul className="mt-8 space-y-5">
                {highlights.map((highlight) => (
                  <li key={highlight} className="flex items-center gap-3">
                    <Check
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 text-[#55D99A]"
                      strokeWidth={3}
                    />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
        <div className="auth-form flex w-full flex-col justify-center p-6 lg:p-8">
          <Logo className="mb-6 lg:hidden" />
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-2 text-slate-600">{subtitle}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}
