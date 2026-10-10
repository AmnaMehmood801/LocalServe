import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { supabase } from "../../lib/supabase";
import { Logo } from "../Logo";

type CategoryLink = { id: string; name: string };

export function Footer() {
  const { t } = useTranslation();
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
    <footer className="bg-[#252724] text-white">
      <div className="shell-container grid gap-8 py-10 sm:grid-cols-3">
        <section>
          <div className="flex items-center gap-3">
            <Logo />
            <h2 className="font-semibold">LocalServe</h2>
          </div>
          <p className="mt-2 max-w-xs text-sm text-slate-400">
            {t("footer.description")}
          </p>
        </section>
        <nav aria-label={t("footer.productLinks")}>
          <h2 className="font-semibold">{t("footer.product")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>
              <Link className="hover:text-white" to="/">
                {t("footer.home")}
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" to="/search">
                {t("footer.search")}
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" to="/#how-it-works">
                {t("footer.howItWorks")}
              </Link>
            </li>
          </ul>
        </nav>
        <div className="grid grid-cols-2 gap-6">
          <nav aria-label={t("footer.popularCategories")}>
            <h2 className="font-semibold">{t("footer.services")}</h2>
            {loading ? (
              <p className="mt-3 text-sm text-slate-400" role="status">
                {t("footer.loading")}
              </p>
            ) : error ? (
              <p className="mt-3 text-sm text-slate-400" role="status">
                {t("footer.categoriesUnavailable")}
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
                {t("footer.noCategories")}
              </p>
            )}
          </nav>
          <nav aria-label={t("footer.supportLinks")}>
            <h2 className="font-semibold">{t("footer.support")}</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>
                <Link className="hover:text-white" to="/privacy">
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link className="hover:text-white" to="/terms">
                  {t("footer.terms")}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="shell-container py-4 text-xs text-slate-400">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
