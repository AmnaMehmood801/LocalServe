import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="shell-container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-semibold text-teal-700">404</p>
      <h1 className="mt-2 text-3xl font-semibold">Page not found</h1>
      <Link
        className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-teal-600 px-5 font-medium text-white hover:bg-teal-700"
        to="/"
      >
        Go home
      </Link>
    </section>
  );
}
