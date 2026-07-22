// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * F4 — маппинг Sanity ↔ фолбэки (src/sanity/content.ts).
 * Главная бизнес-ценность: сайт рендерится И с данными Sanity, И когда fetch
 * вернул null (фолбэк на src/lib). Доказываем оба пути.
 *
 * Моки — только два шва: sanityFetch (источник данных) и urlFor (билдер URL).
 * resolveImage и все мапперы работают ПО-НАСТОЯЩЕМУ. content.ts тянет
 * "server-only" — заглушаем, иначе импорт падает.
 */
vi.mock("server-only", () => ({}));
vi.mock("@/sanity/fetch", () => ({ sanityFetch: vi.fn() }));
vi.mock("@/sanity/image", () => ({ urlFor: vi.fn() }));

import { sanityFetch } from "@/sanity/fetch";
import { urlFor } from "@/sanity/image";
import {
  getPortfolio,
  getReviews,
  getServices,
  getSiteSettings,
  parsePrice,
  resolveImage,
  slugify,
} from "@/sanity/content";
import {
  portfolioQuery,
  reviewsQuery,
  servicesQuery,
  siteSettingsQuery,
} from "@/sanity/queries";
import { SERVICES } from "@/lib/services";
import { PORTFOLIO } from "@/lib/portfolio";
import { REVIEWS } from "@/lib/reviews";

const fetchMock = vi.mocked(sanityFetch);
const urlForMock = vi.mocked(urlFor);
const PLACEHOLDER = "/images/placeholder.svg";

// Детерминированная замена urlFor: цепочка .width(w).auto(fmt).url(),
// кодирующая id и ширину в URL — так мы проверяем, какую ширину передал
// каждый вызывающий, и что src протянулся во view-объект.
const urlForImpl = (src: { __id?: string }) => ({
  width: (w: number) => ({
    auto: () => ({
      url: () => img(src?.__id ?? "x", w),
    }),
  }),
});
const img = (id: string, w: number) => `mock://img?src=${id}&w=${w}&auto=format`;

// Хелперы установки моков (обходим генерик-типы sanityFetch/urlFor).
const setFetch = (v: unknown) => fetchMock.mockResolvedValue(v as never);
const RI = (s: unknown, w?: number) =>
  w === undefined
    ? resolveImage(s as never)
    : resolveImage(s as never, w);

beforeEach(() => {
  vi.clearAllMocks();
  // Восстанавливаем impl шва после clear/restore (глобальный restoreMocks).
  urlForMock.mockImplementation(urlForImpl as never);
});

// ───────────────────────── P0 · фолбэк на null ─────────────────────────
describe("F4 · дуальный путь: фолбэк при null", () => {
  it("S3. getServices(null) → фолбэк src/lib", async () => {
    setFetch(null);
    const r = await getServices();
    expect(r).toEqual(
      SERVICES.map((s) => ({
        ...s,
        image: { src: PLACEHOLDER, unoptimized: true },
      })),
    );
    // независимые литералы (не только пересказ трансформа)
    expect(r.length).toBe(3);
    expect(r[0]!.slug).toBe("personal-shopping");
    expect(r[0]!.image.unoptimized).toBe(true);
    expect(r[2]!.priceValue).toBe(15000);
  });

  it("S4. getPortfolio(null) → фолбэк src/lib (cover/gallery-split)", async () => {
    setFetch(null);
    const r = await getPortfolio();
    expect(r).toEqual(
      PORTFOLIO.map((p) => {
        const [first, ...rest] = p.images;
        const cover = first ?? PLACEHOLDER;
        return {
          id: p.id,
          number: p.number,
          title: p.title,
          shoot: p.shoot,
          description: p.description,
          date: p.date,
          cover,
          gallery: rest.length > 0 ? rest : [cover],
          unoptimized: true,
        };
      }),
    );
    expect(r.length).toBe(8);
    expect(r[0]!.id).toBe("evening-elegance");
    expect(r[0]!.cover).toBe(PLACEHOLDER);
    expect(r[0]!.gallery.length).toBe(11); // 12 кадров − обложка
    expect(r[0]!.unoptimized).toBe(true);
    expect(r[0]!.video).toBeUndefined();
  });

  it("S5. getReviews(null) → фолбэк src/lib (свежая копия)", async () => {
    setFetch(null);
    const r = await getReviews();
    expect(r).toEqual([...REVIEWS]);
    expect(r.length).toBe(10);
    expect(r[0]!.author).toBe("Анна М.");
    expect(r[3]!.rating).toBe(4);
    expect(r).not.toBe(REVIEWS); // не та же ссылка (мутации не заденут исходник)
  });

  it("S6. getSiteSettings(null) → null", async () => {
    setFetch(null);
    expect(await getSiteSettings()).toBeNull();
  });
});

// ───────────────────────── P0 · маппинг данных ─────────────────────────
describe("F4 · путь с данными: маппинг", () => {
  it("S7. getServices(rich) — slug/priceValue/дефолты/ширина 900", async () => {
    setFetch([
      {
        _id: "s1",
        title: "Персональный шопинг",
        price: "20 000 ₽",
        description: "d",
        image: { __id: "img1" },
      },
      { _id: "s2", title: "Consultation", price: "от 4 000 ₽" },
    ]);
    const r = await getServices();
    expect(r).toEqual([
      {
        slug: "персональный-шопинг",
        title: "Персональный шопинг",
        price: "20 000 ₽",
        priceValue: 20000,
        description: "d",
        image: { src: img("img1", 900), unoptimized: false },
      },
      {
        slug: "consultation",
        title: "Consultation",
        price: "от 4 000 ₽",
        priceValue: 4000,
        description: "",
        image: { src: PLACEHOLDER, unoptimized: true },
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(servicesQuery);
  });

  it("S8. getPortfolio(rich) — cover 1400 / gallery 1600 / video / cover исключён", async () => {
    setFetch([
      {
        _id: "p1",
        number: "01",
        title: "T",
        shoot: "S",
        description: "D",
        date: "2026",
        coverImage: { __id: "c" },
        gallery: [{ __id: "g1" }, { __id: "g2" }],
        video: "https://cdn/v.mp4",
      },
    ]);
    const r = await getPortfolio();
    expect(r).toEqual([
      {
        id: "p1",
        number: "01",
        title: "T",
        shoot: "S",
        description: "D",
        date: "2026",
        cover: img("c", 1400),
        gallery: [img("g1", 1600), img("g2", 1600)],
        video: "https://cdn/v.mp4",
        unoptimized: false,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(portfolioQuery);
  });

  it("S9. getReviews(rich) — _id отброшен, rating ?? 5", async () => {
    setFetch([
      { _id: "r1", author: "A", text: "t", rating: 3 },
      { _id: "r2", author: "B", text: "t2" },
    ]);
    const r = await getReviews();
    expect(r).toEqual([
      { author: "A", text: "t", rating: 3 },
      { author: "B", text: "t2", rating: 5 },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(reviewsQuery);
  });

  it("S10. getSiteSettings(rich) — ВСЕ поля + hero 1860 / whyMe 1000", async () => {
    // Полный toEqual ловит любую перепутанную/потерянную проводку скаляров
    // и обе ширины изображений (asymmetry «missing → undefined» — в S17).
    setFetch({
      telegram: "tg",
      instagram: "ig",
      whatsapp: "wa",
      phone: "p",
      email: "e",
      heroImage: { __id: "h" },
      aboutTitle: "AT",
      aboutText: "Atext",
      whyMeTitle: "WT",
      whyMeText: "Wtext",
      whyMeImage: { __id: "w" },
      servicesTerms: "terms",
      bookingIntro: "intro",
    });
    const r = await getSiteSettings();
    expect(r).toEqual({
      telegram: "tg",
      instagram: "ig",
      whatsapp: "wa",
      phone: "p",
      email: "e",
      heroImage: { src: img("h", 1860), unoptimized: false },
      aboutTitle: "AT",
      aboutText: "Atext",
      whyMeTitle: "WT",
      whyMeText: "Wtext",
      whyMeImage: { src: img("w", 1000), unoptimized: false },
      servicesTerms: "terms",
      bookingIntro: "intro",
    });
    expect(fetchMock).toHaveBeenCalledWith(siteSettingsQuery);
  });
});

// ───────────────────────── P1 · resolveImage ─────────────────────────
describe("F4 · resolveImage (реальная фн, стаб билдера)", () => {
  it("S11. реальный источник → src+unoptimized:false, ширина протянута", () => {
    expect(RI({ __id: "x" }, 900)).toEqual({
      src: img("x", 900),
      unoptimized: false,
    });
    expect(RI({ __id: "y" })).toEqual({
      src: img("y", 1200), // дефолтная ширина
      unoptimized: false,
    });
  });

  it("S12. falsy источник → плейсхолдер, urlFor НЕ вызван", () => {
    expect(RI(null)).toEqual({ src: PLACEHOLDER, unoptimized: true });
    expect(RI(undefined)).toEqual({ src: PLACEHOLDER, unoptimized: true });
    expect(urlForMock).not.toHaveBeenCalled();
  });

  it("S13. билдер бросает → catch → плейсхолдер", () => {
    urlForMock.mockImplementationOnce(() => {
      throw new Error("bad ref");
    });
    expect(RI({ __id: "x" })).toEqual({
      src: PLACEHOLDER,
      unoptimized: true,
    });
  });
});

// ───────────────────────── P1 · parsePrice ─────────────────────────
describe("F4 · parsePrice", () => {
  it("S14a. число проходит как есть", () => {
    expect(parsePrice(20000)).toBe(20000);
    expect(parsePrice(0)).toBe(0);
    expect(parsePrice(1999.5)).toBe(1999.5);
  });
  it("S14b. RU-строки → первое число", () => {
    expect(parsePrice("10 000 – 35 000 ₽")).toBe(10000);
    expect(parsePrice("от 4 000 ₽")).toBe(4000);
  });
  it("S14c. типографские пробелы (U+202F / U+2009) в \\s", () => {
    expect(parsePrice("20 000 ₽")).toBe(20000);
    expect(parsePrice("20 000")).toBe(20000);
  });
  it("S14d. пусто/мусор → 0", () => {
    expect(parsePrice("")).toBe(0);
    expect(parsePrice("₽")).toBe(0);
    expect(parsePrice("abc")).toBe(0);
  });
  it("S14e. не строка и не число → 0", () => {
    expect(parsePrice(null)).toBe(0);
    expect(parsePrice(undefined)).toBe(0);
    expect(parsePrice({})).toBe(0);
    expect(parsePrice(true)).toBe(0);
    expect(parsePrice([])).toBe(0);
  });
  it("S14f. FROZEN quirk: разделитель обрывает на первой группе", () => {
    // "10.000" → 10, "1,5" → 1 — намеренное текущее поведение
    expect(parsePrice("10.000")).toBe(10);
    expect(parsePrice("1,5")).toBe(1);
  });
  it("S14g. FROZEN quirk: NaN — typeof 'number' → проходит как NaN", () => {
    expect(Number.isNaN(parsePrice(NaN))).toBe(true);
  });
});

// ───────────────────────── P1 · slugify ─────────────────────────
describe("F4 · slugify", () => {
  it("S15a. латиница", () => {
    expect(slugify("Personal Shopping")).toBe("personal-shopping");
  });
  it("S15b. кириллица сохраняется", () => {
    expect(slugify("Персональный шопинг")).toBe("персональный-шопинг");
  });
  it("S15c. пунктуация/пробелы схлопываются, края тримятся", () => {
    expect(slugify("  Hello,  World!  ")).toBe("hello-world");
    expect(slugify("20 000 ₽")).toBe("20-000");
  });
  it("S15d. только разделители/пусто → 'item'", () => {
    expect(slugify("")).toBe("item");
    expect(slugify("!!!")).toBe("item");
    expect(slugify("—")).toBe("item");
  });
  it("S15e. FROZEN quirk: ё (U+0451) вне а-я → разделитель", () => {
    expect(slugify("Ёлка")).toBe("лка");
    expect(slugify("Approved ✓")).toBe("approved");
  });
});

// ───────────────────────── P2 · null/undefined/[] контракт ─────────────
describe("F4 · контракт null / undefined / []", () => {
  it("S16. коллекции: [] и undefined тоже → фолбэк", async () => {
    setFetch([]);
    expect(await getServices()).toEqual(
      SERVICES.map((s) => ({
        ...s,
        image: { src: PLACEHOLDER, unoptimized: true },
      })),
    );
    setFetch(undefined);
    expect((await getServices()).length).toBe(3);
    // spot-check на другой коллекции
    setFetch([]);
    expect((await getReviews()).length).toBe(10);
  });

  it("S17. settings: {} → объект undefined-полей (не null); undefined → null", async () => {
    setFetch({});
    const r = await getSiteSettings();
    expect(r).not.toBeNull();
    expect(r!.telegram).toBeUndefined();
    expect(r!.heroImage).toBeUndefined();
    setFetch(undefined);
    expect(await getSiteSettings()).toBeNull();
  });
});

// ───────────────────────── P2 · портфолио: новая логика ─────────────
describe("F4 · портфолио: video / gallery / unoptimized", () => {
  const base = {
    _id: "p",
    number: "01",
    title: "T",
    shoot: "S",
    description: "D",
    date: "2026",
  };

  it("S18. video '' или отсутствует → undefined", async () => {
    setFetch([{ ...base, coverImage: { __id: "c" }, video: "" }]);
    expect((await getPortfolio())[0]!.video).toBeUndefined();
    setFetch([{ ...base, coverImage: { __id: "c" } }]);
    expect((await getPortfolio())[0]!.video).toBeUndefined();
  });

  it("S19. пустая галерея → [cover]", async () => {
    setFetch([{ ...base, coverImage: { __id: "c" }, gallery: [] }]);
    expect((await getPortfolio())[0]!.gallery).toEqual([img("c", 1400)]);
    setFetch([{ ...base, coverImage: { __id: "c" } }]); // без ключа gallery
    expect((await getPortfolio())[0]!.gallery).toEqual([img("c", 1400)]);
  });

  it("S20. нет обложки → плейсхолдер+unoptimized, галерея реальная", async () => {
    setFetch([{ ...base, gallery: [{ __id: "g1" }] }]);
    const item = (await getPortfolio())[0]!;
    expect(item.cover).toBe(PLACEHOLDER);
    expect(item.unoptimized).toBe(true);
    expect(item.gallery).toEqual([img("g1", 1600)]);
  });

  it("S21. number по умолчанию — по индексу #${i+1}", async () => {
    setFetch([
      { ...base, number: "07", coverImage: { __id: "c" } },
      { ...base, _id: "p2", number: undefined, coverImage: { __id: "c2" } },
    ]);
    const r = await getPortfolio();
    expect(r.map((x) => x.number)).toEqual(["07", "#2"]);
  });
});
