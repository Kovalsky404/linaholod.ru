import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { InstagramGlyph } from "@/components/ui/SocialIcon";
import { RentCatalog } from "@/components/rent/RentCatalog";
import { RENT, RENT_INSTAGRAM } from "@/lib/site-config";
import {
  RENT_INTRO_FALLBACK,
  RENT_STEPS,
  RENT_TERMS_FALLBACK,
  toLines,
  toParagraphs,
} from "@/lib/rent";
import { pageMetadata } from "@/lib/seo";
import { getRentalItems, getSiteSettings } from "@/sanity/content";

/** ISR (сек): новые вещи из Studio появляются без передеплоя. Литерал. */
export const revalidate = 60;

export const metadata: Metadata = pageMetadata({
  title: "Аренда одежды",
  description:
    "Каталог аренды одежды и аксессуаров lina H. для съёмок и мероприятий. Бронь в Telegram в один клик.",
  path: RENT.href,
});

/**
 * Страница «Аренда одежды» (по мотивам референса): заголовок и вступление,
 * тёмный блок «как это работает» с условиями, каталог карточек, ссылка на
 * Instagram проката.
 *
 * Вещи — документы «Вещь в аренде» в Studio. Тексты — Настройки сайта →
 * Аренда; пустые поля заменяются общими формулировками из src/lib/rent.ts.
 */
export default async function RentPage() {
  const [items, settings] = await Promise.all([
    getRentalItems(),
    getSiteSettings(),
  ]);
  const intro = toParagraphs(settings?.rentIntro || RENT_INTRO_FALLBACK);
  const custom = settings?.rentTerms ? toLines(settings.rentTerms) : [];
  const terms = custom.length > 0 ? custom : [...RENT_TERMS_FALLBACK];

  return (
    <>
      {/* ── Вступление ── */}
      <section
        aria-labelledby="rent-heading"
        className="container-site pt-4 sm:pt-6"
      >
        <Breadcrumbs current={RENT.label} />

        <div className="mt-8 grid gap-8 sm:mt-12 lg:grid-cols-[1.15fr_1fr] lg:items-end lg:gap-16">
          <Reveal>
            <p className="heading-upper text-gray text-xs font-normal">
              Rent&nbsp;•&nbsp;{RENT_INSTAGRAM.handle}
            </p>
            {/* Второе слово серым, а не контуром: Inter вариативный, и обводка
                рисует внутренние пересечения контуров («Ж», «Д» выглядят
                грязно). Серый — тот же, что у скобок заголовков, контраст
                4.7:1 проходит WCAG для крупного текста с запасом. */}
            <h1
              id="rent-heading"
              className="heading-upper text-foreground mt-4 font-black"
              style={{
                fontSize: "clamp(2.75rem,7.2vw,7rem)",
                lineHeight: 0.95,
              }}
            >
              Аренда
              <br />
              <span className="text-gray">одежды</span>
            </h1>
          </Reveal>

          <Reveal delay={80} className="flex flex-col gap-4 lg:pb-2">
            {intro.map((p, i) => (
              <p
                key={i}
                className="text-muted max-w-prose text-base leading-relaxed sm:text-lg"
              >
                {p}
              </p>
            ))}
            <div className="mt-2 flex flex-wrap gap-3">
              <a
                href="#catalog"
                className="btn-solid h-12 px-7 text-sm font-medium"
              >
                Смотреть каталог
              </a>
              <a
                href={RENT_INSTAGRAM.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-pill h-12 px-6 text-sm font-medium"
              >
                <InstagramGlyph width={18} height={18} />
                {RENT_INSTAGRAM.handle}
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Как это работает + условия: тёмный блок, как на референсе ── */}
      <section
        aria-labelledby="rent-how-heading"
        className="container-site mt-12 sm:mt-20"
      >
        <Reveal className="bg-foreground text-background px-6 py-10 sm:px-12 sm:py-14">
          <h2
            id="rent-how-heading"
            className="heading-upper text-2xl font-bold sm:text-3xl"
          >
            Как арендовать
          </h2>

          <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-0">
            {RENT_STEPS.map((step) => (
              <li
                key={step.n}
                className="border-background/15 flex gap-4 md:flex-col md:gap-3 md:border-l md:px-8 md:first:border-l-0 md:first:pl-0"
              >
                <span
                  aria-hidden="true"
                  className="heading-upper text-background/50 text-sm"
                >
                  {step.n}
                </span>
                <div>
                  <h3 className="heading-upper text-base font-semibold">
                    {step.title}
                  </h3>
                  <p className="text-background/70 mt-1.5 text-sm leading-relaxed">
                    {step.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="border-background/15 mt-10 border-t pt-8">
            <h3 className="heading-upper text-background/50 text-xs font-normal">
              Условия аренды
            </h3>
            <ul className="mt-4 grid gap-3 md:grid-cols-3 md:gap-8">
              {terms.map((t, i) => (
                <li
                  key={i}
                  className="text-background/80 text-sm leading-relaxed"
                >
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      {/* ── Каталог ── */}
      <section
        id="catalog"
        aria-labelledby="catalog-heading"
        className="container-site scroll-mt-24 pt-14 pb-16 sm:pt-24 sm:pb-28"
      >
        <SectionHeading id="catalog-heading">Каталог</SectionHeading>
        <RentCatalog items={items} />

        {items.length > 0 ? (
          <div className="border-foreground/10 mt-16 flex flex-col items-start gap-5 border-t pt-10 sm:mt-24 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted max-w-xl text-base leading-relaxed sm:text-lg">
              Новые вещи и образы целиком — в Instagram проката.
            </p>
            <a
              href={RENT_INSTAGRAM.href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-pill h-12 px-7 text-sm font-medium"
            >
              <InstagramGlyph width={18} height={18} />
              {RENT_INSTAGRAM.handle}
            </a>
          </div>
        ) : null}
      </section>
    </>
  );
}
