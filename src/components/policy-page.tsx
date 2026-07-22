type PolicySection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

type PolicyPageProps = {
  title: string;
  description: string;
  updatedAt: string;
  sections: PolicySection[];
};

export function PolicyPage({
  title,
  description,
  updatedAt,
  sections,
}: PolicyPageProps) {
  return (
    <article className="mx-auto w-full max-w-3xl">
      <header className="border-b border-line pb-6">
        <p className="text-sm font-semibold text-info">
          서비스 안내
        </p>

        <h1 className="mt-2 text-2xl font-bold text-main sm:text-3xl">
          {title}
        </h1>

        <p className="mt-3 text-sm leading-7 text-secondary">
          {description}
        </p>

        <p className="mt-4 text-xs text-muted">
          시행일: {updatedAt}
        </p>
      </header>

      <div className="mt-8 space-y-10">
        {sections.map(
          (section, index) => (
            <section
              key={section.title}
              className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-6"
            >
              <h2 className="text-lg font-bold text-main">
                {index + 1}.{" "}
                {section.title}
              </h2>

              {section.paragraphs?.map(
                (paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-4 whitespace-pre-wrap text-sm leading-7 text-secondary"
                  >
                    {paragraph}
                  </p>
                ),
              )}

              {section.items &&
                section.items.length >
                  0 && (
                  <ul className="mt-4 space-y-3">
                    {section.items.map(
                      (item) => (
                        <li
                          key={item}
                          className="flex gap-3 text-sm leading-7 text-secondary"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-[11px] size-1.5 shrink-0 rounded-pill bg-brand"
                          />

                          <span>{item}</span>
                        </li>
                      ),
                    )}
                  </ul>
                )}
            </section>
          ),
        )}
      </div>

      <aside className="mt-8 rounded-card border border-info/20 bg-info-soft p-5">
        <p className="text-sm leading-7 text-secondary">
          현재 문서는 공모전 프로토타입용
          정책입니다. 실제 서비스 운영 전에는
          운영 주체와 개인정보 보호 담당자의
          검토를 거쳐 최종 확정해야 합니다.
        </p>
      </aside>
    </article>
  );
}