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
