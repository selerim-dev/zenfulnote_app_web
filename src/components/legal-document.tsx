type LegalSection = {
  title: string;
  paragraphs: string[];
};

type LegalDocumentProps = {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

export function LegalDocument({
  title,
  updated,
  intro,
  sections,
}: LegalDocumentProps) {
  return (
    <main className="flex-1">
      <article className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <p className="text-sm font-medium uppercase text-muted">{updated}</p>
        <h1 className="editorial mt-4 text-4xl font-semibold leading-[1.06] text-black sm:text-6xl">
          {title}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-muted sm:mt-6 sm:text-lg sm:leading-8">
          {intro}
        </p>
        <div className="mt-10 grid gap-9 sm:mt-12 sm:gap-10">
          {sections.map((section) => (
            <section
              key={section.title}
              className="border-t border-black/10 pt-8"
            >
              <h2 className="editorial text-2xl font-semibold leading-tight text-black sm:text-3xl">
                {section.title}
              </h2>
              <div className="mt-4 grid gap-4 text-base leading-7 text-muted">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
