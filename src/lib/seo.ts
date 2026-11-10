/**
 * SEO-константы и хелперы. Единый источник URL сайта (без хардкода домена).
 */
import { SERVICES } from "@/lib/services";
import { SOCIAL_LINKS } from "@/lib/site-config";

/** Базовый URL сайта из env, фолбэк — localhost. Без слэша в конце. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const SITE_NAME = "lina H.";
export const PERSON_NAME = "Лина Холод";
export const SITE_DESCRIPTION =
  "Личный стилист Лина Холод: персональный шопинг, разбор гардероба и консультации по стилю. Запись онлайн.";

type JsonLdInput = {
  /** Услуги для каталога (из Sanity). Фолбэк — статические SERVICES. */
  services?: { title: string; priceValue: number }[];
  /** Ссылки соцсетей (sameAs). Фолбэк — статические SOCIAL_LINKS. */
  sameAs?: string[];
};

/**
 * Структурированные данные (schema.org ProfessionalService + каталог услуг).
 * Принимает данные из Sanity; при их отсутствии — статический фолбэк.
 */
export function buildJsonLd(input: JsonLdInput = {}) {
  const services =
    input.services ??
    SERVICES.map((s) => ({ title: s.title, priceValue: s.priceValue }));
  const sameAs =
    input.sameAs ??
    SOCIAL_LINKS.filter((s) => s.href && s.href !== "#").map((s) => s.href);

  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: PERSON_NAME,
    alternateName: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    image: `${SITE_URL}/opengraph-image`,
    areaServed: "RU",
    sameAs,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Услуги стилиста",
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.title },
        price: s.priceValue,
        priceCurrency: "RUB",
      })),
    },
  };
}

type PageMetaInput = {
  /** Заголовок страницы (шаблон «%s | lina H.» добавит бренд сам). */
  title: string;
  description: string;
  /** Путь от корня, например "/rent". */
  path: `/${string}`;
};

/**
 * Метаданные подстраницы.
 *
 * Нужны целиком, а не только title: Next сливает метаданные сегментов
 * ПОВЕРХНОСТНО. Без своего `alternates` подстраница унаследовала бы
 * canonical главной («/») — поисковик счёл бы её дублем и выкинул из
 * индекса. По той же причине openGraph задаётся полностью: частичный объект
 * заменил бы родительский вместе с картинкой и siteName.
 */
export function pageMetadata({ title, description, path }: PageMetaInput) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website" as const,
      locale: "ru_RU",
      url: path,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — ${title.toLowerCase()}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: fullTitle,
      description,
      images: ["/opengraph-image"],
    },
  };
}
