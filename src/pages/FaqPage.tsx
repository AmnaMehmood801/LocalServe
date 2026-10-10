import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";

type FaqCategory = "Booking" | "Payments" | "Providers" | "Account";
type FaqItem = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
};

const faqItems: FaqItem[] = [
  {
    id: "book-service",
    category: "Booking",
    question: "How do I book a service?",
    answer:
      "Search by service and area, open a listing, and send a booking request with your preferred date and time. The provider then accepts or declines.",
  },
  {
    id: "account-to-book",
    category: "Account",
    question: "Do I need an account to book?",
    answer:
      "Yes. You can browse listings without an account, but you need a free account to send a booking request.",
  },
  {
    id: "cancel-request",
    category: "Booking",
    question: "Can I cancel a request?",
    answer:
      "Yes. You can cancel from your booking page while the request is still open. Once a job is completed it cannot be cancelled.",
  },
  {
    id: "provider-declines",
    category: "Booking",
    question: "What if a provider declines?",
    answer:
      "Nothing is charged. You can go back to search and send a request to another provider.",
  },
  {
    id: "payment",
    category: "Payments",
    question: "How do I pay?",
    answer:
      "LocalServe does not process payments. You agree the price and payment method directly with the provider.",
  },
  {
    id: "verified",
    category: "Providers",
    question: "What does verified mean?",
    answer:
      "A Verified badge means our team has reviewed the provider's profile.",
  },
  {
    id: "become-provider",
    category: "Providers",
    question: "How do I become a provider?",
    answer:
      "Create an account, choose to offer services, then add a listing with your service, area and price.",
  },
  {
    id: "areas-covered",
    category: "Providers",
    question: "Which areas do you cover?",
    answer:
      "LocalServe currently serves Samundri. Pick your area from the area menu at the top of the site.",
  },
  {
    id: "leave-review",
    category: "Booking",
    question: "Can I leave a review?",
    answer:
      "Yes. After a booking is completed, the customer can rate and review the provider.",
  },
  {
    id: "forgot-password",
    category: "Account",
    question: "I forgot my password.",
    answer:
      'On the login page choose "Forgot password?", enter your email and follow the link we send you.',
  },
];

const categories = ["All", "Booking", "Payments", "Providers", "Account"] as const;
type CategoryFilter = (typeof categories)[number];

export function FaqPage() {
  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("All");
  const [openItemId, setOpenItemId] = useState(faqItems[0].id);
  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredItems = faqItems.filter((item) => {
    const matchesCategory =
      activeCategory === "All" || item.category === activeCategory;
    const matchesSearch =
      !normalizedSearch ||
      `${item.question} ${item.answer} ${item.category}`
        .toLowerCase()
        .includes(normalizedSearch);
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="min-w-0 bg-[#F7F8F7] py-8 sm:py-12">
      <div className="shell-container mx-auto min-w-0 max-w-4xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#168A55]">
            Help centre
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight text-[#404145] sm:text-4xl">
            Frequently asked <span className="text-[#19A463]">questions</span>
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Quick answers about booking, prices and providers on LocalServe.
          </p>
        </header>

        <div className="mt-7">
          <label htmlFor="faq-search" className="sr-only">
            Search a question
          </label>
          <div className="relative">
            <Search
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              id="faq-search"
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search a question"
              className="h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-[#404145] placeholder:text-slate-500 outline-none focus:border-[#19A463] focus:ring-2 focus:ring-[#1DBF73]/20"
            />
          </div>
        </div>

        <div className="mt-4 flex min-w-0 flex-wrap gap-2" aria-label="FAQ categories">
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
                {category}
              </button>
            );
          })}
        </div>

        <section className="mt-5 min-w-0 space-y-3" aria-label="Questions">
          {filteredItems.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              No questions match your search.
            </p>
          ) : (
            filteredItems.map((item) => {
              const isOpen = openItemId === item.id;
              const answerId = `faq-answer-${item.id}`;
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
                      className="flex min-h-14 w-full min-w-0 items-center justify-between gap-4 px-4 py-4 text-left text-sm font-semibold text-[#404145] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#19A463] sm:px-5 sm:text-base"
                    >
                      <span className="min-w-0">{item.question}</span>
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
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <section className="mt-8 rounded-2xl bg-[#19A463] px-5 py-6 text-white sm:px-7 sm:py-7">
          <h2 className="text-lg font-semibold">Still have a question?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/90">
            Can't find your answer here? Ask us and we'll get back to you.
          </p>
          {/* The question form will go here in the next task. */}
        </section>
      </div>
    </main>
  );
}
