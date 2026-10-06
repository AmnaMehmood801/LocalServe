import { useEffect, useRef, useState } from "react";

type LegalPageSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalPageSection[];
  contactEmail?: string;
};

export default function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  sections,
  contactEmail,
}: LegalPageProps) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? "");
  const ignoreObserverRef = useRef(false);
  const observerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function activateSection(sectionId: string) {
    setActiveSectionId(sectionId);
    ignoreObserverRef.current = true;
    if (observerTimeoutRef.current !== null) {
      clearTimeout(observerTimeoutRef.current);
    }
    observerTimeoutRef.current = setTimeout(() => {
      ignoreObserverRef.current = false;
      observerTimeoutRef.current = null;
      if (
        window.innerHeight + window.scrollY >=
        document.body.scrollHeight - 2
      ) {
        const lastSectionId = sections[sections.length - 1]?.id;
        if (lastSectionId) setActiveSectionId(lastSectionId);
      }
    }, 800);
  }

  useEffect(() => {
    const sectionElements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null);
    if (sectionElements.length === 0) return;

    const intersectingSections = new Map<Element, IntersectionObserverEntry>();
    const lastSectionId = sections[sections.length - 1]?.id;
    const isAtBottom = () =>
      window.innerHeight + window.scrollY >= document.body.scrollHeight - 2;
    const observer = new IntersectionObserver(
      (entries) => {
        if (ignoreObserverRef.current) return;
        if (isAtBottom()) {
          if (lastSectionId) setActiveSectionId(lastSectionId);
          return;
        }

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            intersectingSections.set(entry.target, entry);
          } else {
            intersectingSections.delete(entry.target);
          }
        });

        const topSection = [...intersectingSections.values()].sort(
          (first, second) =>
            first.boundingClientRect.top - second.boundingClientRect.top,
        )[0];
        if (topSection) setActiveSectionId(topSection.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    const handleScroll = () => {
      if (!ignoreObserverRef.current && isAtBottom() && lastSectionId) {
        setActiveSectionId(lastSectionId);
      }
    };

    sectionElements.forEach((element) => observer.observe(element));
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [sections]);

  useEffect(
    () => () => {
      if (observerTimeoutRef.current !== null) {
        clearTimeout(observerTimeoutRef.current);
      }
    },
    [],
  );

  function linkClassName(sectionId: string, mobile = false) {
    const itemLayout = mobile
      ? "inline-flex min-h-9 shrink-0 whitespace-nowrap items-center rounded-lg px-3 py-1.5 text-sm leading-snug transition-colors"
      : "flex min-h-9 items-center rounded-lg px-3 py-1.5 text-sm leading-snug transition-colors";

    return `${itemLayout} ${
      activeSectionId === sectionId
        ? "bg-[#E3F7EC] font-medium text-[#168A55]"
        : "text-slate-700 hover:bg-[#F0FAF4]"
    }`;
  }

  return (
    <div className="min-w-0">
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900 md:text-4xl">
          {title}
        </h1>
        <div
          className="mx-auto mt-3 h-1 w-12 rounded-full bg-[#1DBF73]"
          aria-hidden="true"
        />
        <p className="mt-3 text-sm text-slate-500">Last updated: {updated}</p>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600">
          {intro}
        </p>
      </header>

      <div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden min-w-0 lg:block">
          <nav
            className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-4"
            aria-label="On this page"
          >
            <h2 className="px-3 text-sm font-semibold text-slate-900">
              On this page
            </h2>
            <ul className="mt-2 space-y-1">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className={linkClassName(section.id)}
                    aria-current={
                      activeSectionId === section.id ? "location" : undefined
                    }
                    onClick={() => activateSection(section.id)}
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0">
          <nav
            className="flex w-full max-w-full min-w-0 flex-nowrap gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden"
            aria-label="On this page"
          >
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={linkClassName(section.id, true)}
                aria-current={
                  activeSectionId === section.id ? "location" : undefined
                }
                onClick={() => activateSection(section.id)}
              >
                {section.title}
              </a>
            ))}
          </nav>

          <article className="mt-4 min-w-0 rounded-2xl border border-slate-200 bg-white p-6 md:p-8 lg:mt-0">
            {sections.map((section, index) => {
              const isContact = section.id === "contact" && contactEmail;
              const lastParagraphIndex = (section.paragraphs?.length ?? 0) - 1;

              return (
                <section
                  key={section.id}
                  id={section.id}
                  className={`scroll-mt-24 ${
                    index > 0 ? "mt-6 border-t border-slate-200 pt-6" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#E3F7EC] text-sm font-medium text-[#168A55]">
                      {index + 1}
                    </span>
                    <h2 className="min-w-0 text-lg font-semibold text-slate-900">
                      {section.title}
                    </h2>
                  </div>

                  {section.paragraphs?.length ? (
                    <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
                      {section.paragraphs.map((paragraph, paragraphIndex) => (
                        <p key={paragraphIndex}>
                          {paragraph}
                          {isContact &&
                            paragraphIndex === lastParagraphIndex && (
                              <>
                                {" "}
                                <a
                                  href={`mailto:${contactEmail}`}
                                  className="text-[#168A55] no-underline hover:underline"
                                >
                                  {contactEmail}
                                </a>
                              </>
                            )}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  {isContact && !section.paragraphs?.length ? (
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      <a
                        href={`mailto:${contactEmail}`}
                        className="text-[#168A55] no-underline hover:underline"
                      >
                        {contactEmail}
                      </a>
                    </p>
                  ) : null}

                  {section.bullets?.length ? (
                    <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                      {section.bullets.map((bullet, bulletIndex) => (
                        <li
                          key={bulletIndex}
                          className="flex items-start gap-3"
                        >
                          <span
                            className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-[#1DBF73]"
                            aria-hidden="true"
                          />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              );
            })}
          </article>
        </div>
      </div>
    </div>
  );
}
