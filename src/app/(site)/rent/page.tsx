import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { InstagramGlyph } from "@/components/ui/SocialIcon";
import { RentCatalog } from "@/components/rent/RentCatalog";
import { RentRules } from "@/components/rent/RentRules";
import { RentShowcase } from "@/components/rent/RentShowcase";
import { RENT, RENT_INSTAGRAM } from "@/lib/site-config";
import {
  RENT_FACTS,
  RENT_INTRO_FALLBACK,
  RENT_STEPS,
  RENT_TERMS_FALLBACK,
  pickShowcase,
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

/** Подпись-кикер — как на странице сертификата. */
const kickerClass = "heading-upper text-gray text-xs font-normal tracking-wide";

/**
 * Страница «Аренда одежды». Построена по той же схеме, что страница
 * сертификата: слева — витрина на тёплой подложке, справа — заголовок,
 * короткое вступление, три главных факта из правил и действие. Каталог —
 * сразу следом (ради него сюда и приходят), «Как арендовать» — после него.
 *
 * Вещи — документы «Вещь в аренде» в Studio. Тексты — Настройки сайта →
 * Аренда; пустые поля заменяются формулировками из src/lib/rent.ts.
 */
export default async function RentPage() {
  const [items, settings] = await Promise.all([
    getRentalItems(),
    getSiteSettings(),
  ]);
  const intro = toParagraphs(settings?.rentIntro || RENT_INTRO_FALLBACK);
  const custom = settings?.rentTerms ? toLines(settings.rentTerms) : [];
  const terms = custom.length > 0 ? custom : [...RENT_TERMS_FALLBACK];
  const showcase = pickShowcase(items);

  return (
    <>
      {/* ── Первый экран ── */}
      <section
        aria-labelledby="rent-heading"
        className="container-site pt-4 sm:pt-6"
      >
        <Breadcrumbs current={RENT.label} />

        <div
          className={`mt-5 grid gap-8 sm:mt-6 ${
            showcase.length > 0
              ? "lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_28rem] xl:gap-20"
              : ""
          }`}
        >
          {showcase.length > 0 ? <RentShowcase items={showcase} /> : null}

          <Reveal className="flex flex-col justify-center">
            <p className={kickerClass}>
              Rent&nbsp;•&nbsp;{RENT_INSTAGRAM.handle}
            </p>
            <h1
              id="rent-heading"
              className="heading-upper text-foreground mt-3 font-bold"
              style={{
                fontSize: "clamp(1.875rem,3.2vw,2.75rem)",
                lineHeight: 1.02,
              }}
            >
              Аренда одежды
            </h1>
            {intro.map((p, i) => (
              <p
                key={i}
                className="text-muted mt-4 max-w-prose text-base leading-relaxed"
              >
                {p}
              </p>
            ))}

            {/* Главное из правил — тремя цифрами, чтобы условия считывались
                до того, как человек полезет в полный список. */}
            <ul className="border-foreground/10 mt-7 grid grid-cols-3 border-y">
              {RENT_FACTS.map((f) => (
                <li
                  key={f.value}
                  className="border-foreground/10 border-l py-5 pl-4 first:border-l-0 first:pl-0"
                >
                  <span className="heading-upper text-foreground block text-2xl font-bold sm:text-[1.75rem]">
                    {f.value}
                  </span>
                  <span className="text-gray mt-1.5 block text-xs leading-snug">
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
              <a
                href="#catalog"
                className="btn-solid h-14 px-7 text-sm font-medium sm:flex-1"
              >
                Смотреть каталог
              </a>
              <a
                href={RENT_INSTAGRAM.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-pill h-14 px-6 text-sm font-medium"
              >
                <InstagramGlyph width={18} height={18} />
                {RENT_INSTAGRAM.handle}
              </a>
            </div>

            <RentRules terms={terms} className="mt-7" />
          </Reveal>
        </div>
      </section>

      {/* ── Каталог ── */}
      <section
        id="catalog"
        aria-labelledby="catalog-heading"
        className="container-site scroll-mt-20 pt-16 sm:scroll-mt-24 sm:pt-28"
      >
        <SectionHeading id="catalog-heading">Каталог</SectionHeading>
        <RentCatalog items={items} />
      </section>

      {/* ── Как арендовать: светлый блок после каталога ── */}
      <section
        aria-labelledby="rent-how-heading"
        className="container-site pt-16 pb-16 sm:pt-28 sm:pb-28"
      >
        {/* Заголовок — отдельной строкой во всю ширину: в узкой колонке
            «[ Как арендовать ]» переносился на две строки. */}
        <div className="border-foreground/10 border-t pt-10 sm:pt-16">
          <Reveal>
            <SectionHeading id="rent-how-heading">
              Как арендовать
            </SectionHeading>
          </Reveal>
        </div>
        <div className="mt-8 grid gap-10 sm:mt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
          <Reveal>
            <p className="text-muted max-w-sm text-base leading-relaxed">
              Без форм и регистрации: бронь — в Telegram, подбор образа
              стилистом — бесплатно.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <RentRules terms={terms} variant="pill" />
              <a
                href={RENT_INSTAGRAM.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-pill h-12 px-6 text-sm font-medium"
              >
                <InstagramGlyph width={16} height={16} />
                {RENT_INSTAGRAM.handle}
              </a>
            </div>
          </Reveal>

          <ol className="grid gap-8 sm:grid-cols-3 sm:gap-6 lg:gap-10">
            {RENT_STEPS.map((step, i) => (
              <Reveal as="li" key={step.n} delay={i * 80}>
                <span
                  aria-hidden="true"
                  className="heading-upper text-foreground/15 block font-black"
                  style={{
                    fontSize: "clamp(3rem,5vw,4.5rem)",
                    lineHeight: 0.9,
                  }}
                >
                  {step.n}
                </span>
                <h3 className="heading-upper text-foreground mt-4 text-base font-semibold">
                  {step.title}
                </h3>
                <p className="text-muted mt-2 text-sm leading-relaxed">
                  {step.text}
                </p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
