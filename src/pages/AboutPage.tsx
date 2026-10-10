import { useEffect, useRef, useState, type ReactNode } from "react";
import { BadgeCheck, Handshake, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
      if (event.matches) setVisible(true);
    };
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || visible) return;

    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.12 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: visible && !prefersReducedMotion
          ? "opacity 500ms ease-out, transform 500ms ease-out"
          : "none",
      }}
    >
      {children}
    </div>
  );
}

const principles = [
  {
    titleKey: "about.verifiedTitle",
    descriptionKey: "about.verifiedDescription",
    Icon: BadgeCheck,
    background: "bg-[#CFE9DB]",
  },
  {
    titleKey: "about.reviewsTitle",
    descriptionKey: "about.reviewsDescription",
    Icon: Star,
    background: "bg-[#E3F7EC]",
  },
  {
    titleKey: "about.pricingTitle",
    descriptionKey: "about.pricingDescription",
    Icon: Handshake,
    background: "bg-[#E6E9EC]",
  },
];

export function AboutPage() {
  const { t } = useTranslation();

  return (
    <main className="min-w-0 overflow-hidden bg-[#F7F8F7] py-8 sm:py-12">
      <div className="shell-container mx-auto min-w-0 max-w-4xl">
        <Reveal className="min-w-0 text-center">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#168A55]">
              {t("about.eyebrow")}
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-[#404145] sm:text-4xl">
              {t("about.titleStart")} <em className="font-bold italic text-[#19A463]">{t("about.titleHighlight")}</em>
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#404145] sm:text-base">
              {t("about.subtitle")}
            </p>
          </header>
        </Reveal>

        <Reveal className="mt-7 min-w-0 sm:mt-8">
          <section
            aria-label={t("about.photoLabel")}
            className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-4"
          >
            <img
              src="/ac-repair.jpg"
              alt={t("about.photoStripAlt")}
              loading="lazy"
              className="col-span-2 aspect-[16/7] w-full min-w-0 rounded-2xl object-cover md:col-span-4"
            />
          </section>
        </Reveal>

        <section className="mt-8 grid min-w-0 items-center gap-5 sm:mt-10 md:grid-cols-2 md:gap-10">
          <Reveal className="min-w-0">
            <img
              src="/ac-repair.jpg"
              alt={t("about.storyPhotoAlt")}
              loading="lazy"
              className="aspect-[4/3] w-full min-w-0 rounded-3xl object-cover"
            />
          </Reveal>
          <div className="min-w-0">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#168A55]">
                {t("about.storyEyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-bold leading-tight text-[#404145] sm:text-3xl">
                {t("about.storyTitleStart")} <em className="font-bold italic text-[#19A463]">{t("about.storyTitleHighlight")}</em>
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#404145] sm:text-base">
                {t("about.storyParagraph")}
              </p>
            </Reveal>
          </div>
        </section>

        <section className="mt-8 min-w-0 border-t border-slate-200 pt-7 sm:mt-10 sm:pt-8" aria-labelledby="principles-heading">
          <Reveal>
            <h2
              id="principles-heading"
              className="text-2xl font-bold leading-tight text-[#404145] sm:text-3xl"
            >
              {t("about.principlesTitleStart")} <em className="font-bold italic text-[#19A463]">{t("about.principlesTitleHighlight")}</em>
            </h2>
          </Reveal>
          <div className="mt-5 grid min-w-0 gap-3 md:grid-cols-3">
            {principles.map(({ titleKey, descriptionKey, Icon, background }) => (
              <Reveal key={titleKey} className="min-w-0">
                <article className={`h-full min-w-0 rounded-2xl border border-slate-200 ${background} p-5`}>
                  <Icon size={20} aria-hidden="true" className="text-[#1F6F4F]" />
                  <h3 className="mt-4 font-semibold text-[#404145]">{t(titleKey)}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#404145]">
                    {t(descriptionKey)}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <Reveal className="mt-8 min-w-0 sm:mt-10">
          <section className="flex min-w-0 flex-col items-center gap-5 rounded-3xl bg-[#1F6F4F] px-5 py-7 text-center text-white sm:px-8 sm:py-9 md:flex-row md:justify-between md:gap-8 md:text-start">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
                {t("about.ctaTitleStart")} <em className="font-bold italic">{t("about.ctaTitleHighlight")}</em>
              </h2>
              <p className="mt-2 text-sm leading-6 text-white sm:text-base">
                {t("about.ctaDescription")}
              </p>
            </div>
            <div className="flex min-w-0 w-full flex-col items-center justify-center gap-3 md:w-auto md:flex-row">
              <Link
                to="/search"
                className="inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-lg bg-[#1DBF73] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#19A463] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:w-auto"
              >
                {t("about.findService")}
              </Link>
              <Link
                to="/register"
                className="inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-lg border border-white px-5 text-sm font-semibold text-white transition-colors hover:bg-[#19A463] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:w-auto"
              >
                {t("about.becomeProvider")}
              </Link>
            </div>
          </section>
        </Reveal>
      </div>
    </main>
  );
}
