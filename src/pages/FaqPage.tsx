import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Search } from "lucide-react";

type FaqCategory = "booking" | "payments" | "providers" | "account";
type FaqItem = {
  id: string;
  category: FaqCategory;
};

const faqItems: FaqItem[] = [
  { id: "book-service", category: "booking" },
  { id: "account-to-book", category: "account" },
  { id: "cancel-request", category: "booking" },
  { id: "provider-declines", category: "booking" },
  { id: "payment", category: "payments" },
  { id: "verified", category: "providers" },
  { id: "become-provider", category: "providers" },
  { id: "areas-covered", category: "providers" },
  { id: "leave-review", category: "booking" },
  { id: "forgot-password", category: "account" },
];

const categories = ["all", "booking", "payments", "providers", "account"] as const;
type CategoryFilter = (typeof categories)[number];

export function FaqPage() {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [openItemId, setOpenItemId] = useState(faqItems[0].id);
  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredItems = faqItems.filter((item) => {
    const question = t(`faq.items.${item.id}.question`);
    const answer = t(`faq.items.${item.id}.answer`);
    const category = t(`faq.categories.${item.category}`);
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    const matchesSearch =
      !normalizedSearch ||
      `${question} ${answer} ${category}`
        .toLowerCase()
        .includes(normalizedSearch);
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="min-w-0 bg-[#F7F8F7] py-8 sm:py-12">
      <div className="shell-container mx-auto min-w-0 max-w-4xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#168A55]">
            {t("faq.helpCentre")}
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight text-[#404145] sm:text-4xl">
            {t("faq.titleStart")} <span className="text-[#19A463]">{t("faq.titleHighlight")}</span>
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            {t("faq.subtitle")}
          </p>
        </header>

        <div className="mt-7">
          <label htmlFor="faq-search" className="sr-only">
            {t("faq.searchLabel")}
          </label>
          <div className="relative">
            <Search
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              id="faq-search"
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={t("faq.searchPlaceholder")}
              className="h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white ps-11 pe-4 text-sm text-[#404145] placeholder:text-slate-500 outline-none focus:border-[#19A463] focus:ring-2 focus:ring-[#1DBF73]/20"
            />
          </div>
        </div>

        <div className="mt-4 flex min-w-0 flex-wrap gap-2" aria-label={t("faq.categoriesLabel")}>
          {categories.map((category) => {
            const isActive = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveCategory(category)}
                className={`inline-flex min-h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19A463] ${
                  isActive
                    ? "border-[#1DBF73] bg-[#1DBF73] text-white"
                    : "border-slate-200 bg-white text-[#404145] hover:border-[#19A463] hover:bg-[#E3F7EC]"
                }`}
              >
                {t(`faq.categories.${category}`)}
              </button>
            );
          })}
        </div>

        <section className="mt-5 min-w-0 space-y-3" aria-label={t("faq.questionsLabel")}>
          {filteredItems.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              {t("faq.empty")}
            </p>
          ) : (
            filteredItems.map((item) => {
              const isOpen = openItemId === item.id;
              const answerId = `faq-answer-${item.id}`;
              const question = t(`faq.items.${item.id}.question`);
              const answer = t(`faq.items.${item.id}.answer`);
              return (
                <article
                  key={item.id}
                  className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <h2>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={answerId}
                      onClick={() =>
                        setOpenItemId(isOpen ? "" : item.id)
                      }
                      className="flex min-h-14 w-full min-w-0 items-center justify-between gap-4 px-4 py-4 text-start text-sm font-semibold text-[#404145] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#19A463] sm:px-5 sm:text-base"
                    >
                      <span className="min-w-0">{question}</span>
                      <ChevronDown
                        size={18}
                        aria-hidden="true"
                        className={`shrink-0 text-[#168A55] transition-transform duration-200 motion-reduce:transition-none ${
                          isOpen ? "rotate-180" : "rotate-0"
                        }`}
                      />
                    </button>
                  </h2>
                  <div
                    id={answerId}
                    aria-hidden={!isOpen}
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <p className="border-t border-slate-200 px-4 pb-5 pt-4 text-sm leading-6 text-slate-600 sm:px-5">
                        {answer}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <section className="mt-8 rounded-2xl bg-[#19A463] px-5 py-6 text-white sm:px-7 sm:py-7">
          <h2 className="text-lg font-semibold">{t("faq.ctaTitle")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/90">
            {t("faq.ctaDescription")}
          </p>
          {/* The question form will go here in the next task. */}
        </section>
      </div>
    </main>
  );
}
