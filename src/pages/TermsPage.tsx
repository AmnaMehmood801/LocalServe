import { useEffect } from "react";
import { BackButton } from "../components/ui/BackButton";

export function TermsPage() {
  useEffect(() => {
    document.title = "Terms · LocalServe";
    return () => {
      document.title = "LocalServe";
    };
  }, []);

  return (
    <article className="shell-container max-w-3xl py-10 md:py-14">
      <BackButton fallback="/" label="Back" className="mb-4" />
      <p className="text-xs font-semibold uppercase text-slate-600">
        LocalServe · Samundri
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Terms</h1>
      <p className="mt-5 text-sm leading-7 text-slate-600">
        LocalServe helps customers discover local services and send booking
        requests to independent providers in Samundri.
      </p>
      <section className="mt-8 border-t border-cream-100 pt-6">
        <h2 className="text-lg font-semibold">Requests and payment</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          A booking request is not confirmed until the provider accepts it.
          Customers and providers agree payment directly; LocalServe does not
          process payment in this version.
        </p>
      </section>
      <p className="mt-8 rounded-xl border border-cream-100 bg-white p-5 text-sm leading-6 text-slate-600">
        This is a draft terms placeholder. Complete terms should be reviewed and
        published before launch.
      </p>
    </article>
  );
}
