// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildJsonLd, SITE_URL } from "./seo";

/**
 * F5 — SEO/JSON-LD (src/lib/seo.ts). Тонкий модуль: константы + buildJsonLd.
 * Швов нет (импортит чистые константы) — моки не нужны, кроме env для SITE_URL.
 *
 * Идентити-строки захардкожены как независимый источник правды (не импорт),
 * чтобы своп name/alternateName и т.п. краснел.
 */

// Ожидаемый каталог по статическим SERVICES (src/lib/services.ts).
const DEFAULT_OFFERS = [
  {
    "@type": "Offer",
    itemOffered: { "@type": "Service", name: "Персональный шопинг" },
    price: 20000,
    priceCurrency: "RUB",
  },
  {
    "@type": "Offer",
    itemOffered: { "@type": "Service", name: "Консультация" },
    price: 10000,
    priceCurrency: "RUB",
  },
  {
    "@type": "Offer",
    itemOffered: { "@type": "Service", name: "Разбор гардероба" },
    price: 15000,
    priceCurrency: "RUB",
  },
];

// sameAs: WhatsApp "#" отфильтрован, порядок сохранён (см. SOCIAL_LINKS).
const DEFAULT_SAMEAS = [
  "https://t.me/AHL2060",
  "https://www.instagram.com/_bulochka__s__makom_/",
];

describe("buildJsonLd · дефолтный каталог", () => {
  it("1. offers маппятся поэлементно (count + содержимое + порядок)", () => {
    const ld = buildJsonLd();
    expect(ld.hasOfferCatalog.itemListElement).toHaveLength(3);
    expect(ld.hasOfferCatalog.itemListElement).toEqual(DEFAULT_OFFERS);
    expect(ld.hasOfferCatalog["@type"]).toBe("OfferCatalog");
    expect(ld.hasOfferCatalog.name).toBe("Услуги стилиста");
  });

  it("2. price — ЧИСЛО, currency — 'RUB'", () => {
    const offers = buildJsonLd().hasOfferCatalog.itemListElement;
    for (const o of offers) {
      expect(typeof o.price).toBe("number");
      expect(o.priceCurrency).toBe("RUB");
    }
    expect(offers[0]!.price).toBe(20000);
    // ⚠️ conformance-флаг: schema.org каноничен со СТРОКОВОЙ ценой ("20000").
    // Код эмитит число — пришпиливаем текущее поведение, помечаем как gap.
  });

  it("3. sameAs фильтрует '#', сохраняет порядок, без dedup", () => {
    expect(buildJsonLd().sameAs).toEqual(DEFAULT_SAMEAS);
    expect(buildJsonLd().sameAs).toHaveLength(2);
  });

  it("7. статические идентити-поля — точные значения", () => {
    const ld = buildJsonLd();
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("ProfessionalService");
    expect(ld.name).toBe("Лина Холод"); // PERSON_NAME (не SITE_NAME)
    expect(ld.alternateName).toBe("lina H."); // SITE_NAME
    // захардкожено (не импорт) — ловит регресс текста описания
    expect(ld.description).toBe(
      "Личный стилист Лина Холод: персональный шопинг, разбор гардероба и консультации по стилю. Запись онлайн.",
    );
    expect(ld.areaServed).toBe("RU");
  });

  it("8. url/image берутся из SITE_URL, без двойного слэша", () => {
    const ld = buildJsonLd();
    expect(ld.url).toBe(SITE_URL);
    expect(ld.image).toBe(`${SITE_URL}/opengraph-image`);
    // единственный '//' — только в протоколе
    expect(ld.image.replace("://", "")).not.toContain("//");
  });
});

describe("buildJsonLd · аргументы (Sanity-путь); пустой массив уважается", () => {
  it("4. явные services override фолбэк и маппятся", () => {
    const ld = buildJsonLd({ services: [{ title: "X", priceValue: 999 }] });
    expect(ld.hasOfferCatalog.itemListElement).toEqual([
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "X" },
        price: 999,
        priceCurrency: "RUB",
      },
    ]);
  });

  it("5. services: [] → пустой каталог, НЕ заменяется фолбэком", () => {
    // ([] истинно, так что и ?? и || его сохраняют — ловим замену на фолбэк,
    //  а не различие ?? vs ||)
    const ld = buildJsonLd({ services: [] });
    expect(ld.hasOfferCatalog.itemListElement).toEqual([]);
    expect(ld.hasOfferCatalog.name).toBe("Услуги стилиста");
  });

  it("6. sameAs: [] уважается (не заменяется фолбэком)", () => {
    expect(buildJsonLd({ sameAs: [] }).sameAs).toEqual([]);
  });
});

describe("buildJsonLd · сериализуемость", () => {
  it("10. round-trip JSON и отсутствие undefined в обязательных ключах", () => {
    for (const ld of [buildJsonLd(), buildJsonLd({ services: [] })]) {
      expect(JSON.parse(JSON.stringify(ld))).toEqual(ld);
      for (const key of ["@context", "@type", "name", "url", "hasOfferCatalog"]) {
        expect((ld as Record<string, unknown>)[key]).toBeDefined();
      }
    }
  });
});

describe("SITE_URL · env + trailing slash (dynamic import)", () => {
  // SITE_URL фиксируется при загрузке модуля из env → нужен resetModules +
  // stubEnv + динамический импорт; статический импорт заморозил бы значение.
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("9a. env override + срез хвостового слэша", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lina.example/");
    const mod = await import("./seo");
    expect(mod.SITE_URL).toBe("https://lina.example");
    expect(mod.buildJsonLd().url).toBe("https://lina.example");
    expect(mod.buildJsonLd().image).toBe(
      "https://lina.example/opengraph-image",
    );
  });

  it("9b. env не задан → localhost без слэша", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined as unknown as string);
    const mod = await import("./seo");
    expect(mod.SITE_URL).toBe("http://localhost:3000");
  });
});
