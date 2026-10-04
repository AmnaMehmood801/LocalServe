import { Link } from "react-router-dom";

export function ProtectedPlaceholderPage({ title }: { title: string }) {
  return (
    <section className="shell-container py-12">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">
        This section is being built.
      </p>
      <Link
        className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-ink/20 bg-white px-4 font-medium hover:bg-cream-100"
        to="/"
      >
        Back to LocalServe
      </Link>
    </section>
  );
}
