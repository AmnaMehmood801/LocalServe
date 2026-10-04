import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { supabase } from "../../lib/supabase";
import { Logo } from "../Logo";

type CategoryLink = { id: string; name: string };

export function Footer() {
  const [categories, setCategories] = useState<CategoryLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadCategories() {
      const { data, error: queryError } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order")
        .limit(5);

      if (mounted) {
        setCategories(data ?? []);
        setError(Boolean(queryError));
        setLoading(false);
      }
    }
    void loadCategories();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <footer className="bg-[#404145] text-white">
      <div className="shell-container grid gap-8 py-10 sm:grid-cols-3">
        <section>
          <div className="flex items-center gap-3">
            <Logo />
            <h2 className="font-semibold">LocalServe</h2>
          </div>
          <p className="mt-2 max-w-xs text-sm text-slate-400">
            Find trusted professionals in Samundri. Compare services, then
            request a time that works.
          </p>
        </section>
        <nav aria-label="Product links">
          <h2 className="font-semibold">Product</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>
              <Link className="hover:text-white" to="/">
                Home
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" to="/search">
                Search
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" to="/#how-it-works">
                How it works
              </Link>
            </li>
          </ul>
        </nav>
        <div className="grid grid-cols-2 gap-6">
          <nav aria-label="Popular categories">
            <h2 className="font-semibold">Services</h2>
            {loading ? (
              <p className="mt-3 text-sm text-slate-400" role="status">
                Loading...
              </p>
            ) : error ? (
              <p className="mt-3 text-sm text-slate-400" role="status">
                Categories unavailable.
              </p>
            ) : categories.length ? (
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {categories.map((category) => (
                  <li key={category.id}>
                    <Link
                      className="hover:text-white"
                      to={`/search?categoryId=${encodeURIComponent(category.id)}`}
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-400">
                No categories available.
              </p>
            )}
          </nav>
          <nav aria-label="Support links">
            <h2 className="font-semibold">Support</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>
                <Link className="hover:text-white" to="/privacy">
                  Privacy
                </Link>
              </li>
              <li>
                <Link className="hover:text-white" to="/terms">
                  Terms
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="shell-container py-4 text-xs text-slate-400">
          &copy; {new Date().getFullYear()} LocalServe · Prices in PKR
        </p>
      </div>
    </footer>
  );
}
