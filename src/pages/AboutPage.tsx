import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Handshake,
  Star,
} from "lucide-react";
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
              src="/team.jpg"
              alt={t("about.photoStripAlt")}
              loading="lazy"
              className="col-span-2 aspect-[4/3] w-full min-w-0 rounded-2xl object-cover object-[50%_35%] md:col-span-4 md:aspect-auto md:h-[80vh] md:min-h-[420px] md:max-h-[760px]"
            />
          </section>
        </Reveal>

        <section className="mt-8 grid min-w-0 items-center gap-5 sm:mt-10 md:grid-cols-2 md:gap-10">
          <Reveal className="min-w-0">
            <img
              src="/team-van.jpg"
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
          <section className="grid min-w-0 overflow-hidden rounded-3xl bg-[#1F6F4F] text-start md:grid-cols-[55%_45%]">
            <div className="flex min-w-0 flex-col justify-center gap-5 ps-5 pe-5 py-6 sm:ps-8 sm:pe-8 md:py-8 md:ps-10 lg:ps-14">
              <div className="min-w-0">
                <h2 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
                  {t("about.ctaTitleStart")} <em className="font-bold italic">{t("about.ctaTitleHighlight")}</em>
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/80 sm:text-base">
                  {t("about.ctaDescription")}
                </p>
              </div>
              <div className="flex w-full min-w-0 flex-col gap-3 md:flex-row">
                <Link
                  to="/search"
                  className="inline-flex h-10 w-auto items-center justify-center gap-3 rounded-full bg-white px-5 text-sm font-semibold text-[#1F6F4F] transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {t("about.findService")}
                </Link>
                <Link
                  to="/register"
                  className="inline-flex h-10 w-auto items-center justify-center gap-3 rounded-full border border-white/60 bg-transparent px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {t("about.becomeProvider")}
                </Link>
              </div>
            </div>
            <div className="hidden min-w-0 self-end justify-self-end md:block">
              <img
                src="/book-a-pro-cta-illustration.webp"
                alt=""
                loading="lazy"
                className="block h-48 w-auto object-contain object-bottom md:h-60"
              />
            </div>
          </section>
        </Reveal>
      </div>
    </main>
  );
}
