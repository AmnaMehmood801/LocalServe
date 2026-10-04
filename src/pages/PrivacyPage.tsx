import { useEffect } from "react";

export function PrivacyPage() {
  useEffect(() => {
    document.title = "Privacy · LocalServe";
    return () => {
      document.title = "LocalServe";
    };
  }, []);

  return (
    <article className="shell-container max-w-3xl py-10 md:py-14">
      <p className="text-xs font-semibold uppercase text-slate-600">
        LocalServe · Samundri
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Privacy</h1>
      <p className="mt-5 text-sm leading-7 text-slate-600">
        LocalServe uses account and booking information to connect customers
        with local service providers and operate requested services.
      </p>
      <section className="mt-8 border-t border-cream-100 pt-6">
        <h2 className="text-lg font-semibold">Information and visibility</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Profile details support your account. Phone numbers are not shown on
          public listings. A service address and booking notes are available to
          the customer and provider involved in that booking, subject to account
          access controls.
        </p>
      </section>
      <p className="mt-8 rounded-xl border border-cream-100 bg-white p-5 text-sm leading-6 text-slate-600">
        This is a draft privacy notice placeholder. A complete policy should be
        reviewed and published before launch.
      </p>
    </article>
  );
}
