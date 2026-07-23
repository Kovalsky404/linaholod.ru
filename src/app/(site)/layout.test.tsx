import { describe, expect, it, vi } from "vitest";
import { render, within } from "@testing-library/react";
import type { ServiceView, SiteSettingsView } from "@/sanity/types";
import { SOCIAL_LINKS } from "@/lib/site-config";

/**
 * F13 — сборка site-layout (src/app/(site)/layout.tsx): JSON-LD sameAs +
 * проброс соцссылок в Footer. buildJsonLd() сам по себе жёстко покрыт в F5
 * (src/lib/seo.test.ts) — здесь НЕ дублируем структуру каталога/сериализацию
 * offers, вызываем buildJsonLd по-настоящему и проверяем только результат
 * ДВУХ undefined-конверсий, которые живут именно в layout.tsx:
 *
 *   sameAs = settings ? [tg, ig, wa].filter(u => u && u !== "#") : undefined;
 *   ...buildJsonLd({ sameAs: sameAs && sameAs.length > 0 ? sameAs : undefined })
 *
 * Тонкость: settings=null И settings-с-пустыми-соц-полями — РАЗНЫЕ ветки
 * кода (первая — тернарник на строке 64, вторая — guard на строке 74), но
 * обе схлопываются в один и тот же наблюдаемый результат (sameAs = статический
 * фолбэк). Нужны оба теста, иначе сломанный guard пройдёт незамеченным.
 *
 * Мердж-матрица Footer(social) — уже в Footer.test.tsx (юнит, без layout).
 * Здесь только один шов-тест: реальная ссылка из Sanity долетает до футера.
 */

vi.mock("@/sanity/content", () => ({
  getServices: vi.fn(),
  getSiteSettings: vi.fn(),
}));

import { getServices, getSiteSettings } from "@/sanity/content";
import SiteLayout from "./layout";

const getServicesMock = vi.mocked(getServices);
const getSiteSettingsMock = vi.mocked(getSiteSettings);

const MOCK_SERVICE: ServiceView = {
  slug: "test-service",
  title: "Тестовая услуга",
  price: "10 000 ₽",
  priceValue: 10000,
  description: "Описание",
  image: { src: "https://cdn.example/service.jpg", unoptimized: true },
};

/** Статический фолбэк sameAs — тот же фильтр, что и в layout.tsx/seo.ts. */
const FALLBACK_SAME_AS = SOCIAL_LINKS.filter(
  (s) => s.href && s.href !== "#",
).map((s) => s.href);

function mockData({
  services = [MOCK_SERVICE],
  settings,
}: {
  services?: ServiceView[];
  settings: SiteSettingsView | null;
}) {
  getServicesMock.mockResolvedValue(services);
  getSiteSettingsMock.mockResolvedValue(settings);
}

async function renderLayout(
  children: React.ReactNode = <div data-testid="child">контент страницы</div>,
) {
  return render(await SiteLayout({ children }));
}

function jsonLdOf(container: HTMLElement) {
  const script = container.querySelector<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  );
  expect(script).not.toBeNull();
  return JSON.parse(script!.textContent ?? "{}");
}

describe("F13 · JSON-LD sameAs — фильтр и фолбэк", () => {
  it("L1. плейсхолдер '#' (whatsapp) исключён из sameAs", async () => {
    mockData({
      settings: {
        telegram: "https://t.me/realaccount",
        instagram: "https://instagram.com/realaccount",
        whatsapp: "#",
      },
    });
    const { container } = await renderLayout();

    const sameAs = jsonLdOf(container).sameAs as string[];
    expect(sameAs).not.toContain("#");
    expect(sameAs).toContain("https://t.me/realaccount");
    expect(sameAs).toContain("https://instagram.com/realaccount");
  });

  it("L2. частичный sameAs (одна реальная ссылка) уважается — НЕ мержится со статическим фолбэком", async () => {
    mockData({
      settings: {
        telegram: "https://t.me/realaccount",
        instagram: "",
        whatsapp: "#",
      },
    });
    const { container } = await renderLayout();

    expect(jsonLdOf(container).sameAs).toEqual(["https://t.me/realaccount"]);
  });

  it("L3. settings=null → sameAs === статический фолбэк (не [])", async () => {
    mockData({ settings: null });
    const { container } = await renderLayout();

    expect(jsonLdOf(container).sameAs).toEqual(FALLBACK_SAME_AS);
    expect((jsonLdOf(container).sameAs as string[]).length).toBeGreaterThan(0);
  });

  it("L4. settings есть, но все соц-поля пустые/'#' → sameAs === статический фолбэк (двойная undefined-конверсия)", async () => {
    // Truthy settings-объект (НЕ null) — иначе тест дублирует L3 и не
    // проверяет реальную ветку: filter([]) → guard length>0 → undefined.
    mockData({
      settings: { telegram: "", instagram: "", whatsapp: "#" },
    });
    const { container } = await renderLayout();

    expect(jsonLdOf(container).sameAs).toEqual(FALLBACK_SAME_AS);
  });
});

describe("F13 · JSON-LD сериализация", () => {
  it("L5. jsonLd реально сериализован в <script type=application/ld+json> и парсится", async () => {
    mockData({ settings: null });
    const { container } = await renderLayout();

    const jsonLd = jsonLdOf(container);
    expect(jsonLd["@type"]).toBe("ProfessionalService");
    expect(jsonLd.hasOfferCatalog).toBeDefined();
  });

  it("L5b. services из getServices() доходят до offer'ов каталога (title+priceValue)", async () => {
    mockData({ settings: null });
    const { container } = await renderLayout();

    const offers = jsonLdOf(container).hasOfferCatalog.itemListElement as {
      itemOffered: { name: string };
      price: number;
    }[];
    expect(offers).toContainEqual(
      expect.objectContaining({
        itemOffered: expect.objectContaining({ name: MOCK_SERVICE.title }),
        price: MOCK_SERVICE.priceValue,
      }),
    );
  });
});

describe("F13 · шов layout → Footer", () => {
  it("L6. реальная ссылка Telegram из Sanity долетает до футера", async () => {
    mockData({
      settings: {
        telegram: "https://t.me/realaccount",
        instagram: "",
        whatsapp: "#",
      },
    });
    const { container } = await renderLayout();

    const footer = container.querySelector<HTMLElement>("#contacts")!;
    expect(
      within(footer).getByRole("link", { name: "Telegram" }),
    ).toHaveAttribute("href", "https://t.me/realaccount");
  });
});

describe("F13 · хром страницы: header → main(children) → footer", () => {
  it("L7. children рендерятся внутри <main>, хром — в правильном порядке", async () => {
    mockData({ settings: null });
    const { container } = await renderLayout(
      <div data-testid="child">контент страницы</div>,
    );

    const main = container.querySelector<HTMLElement>("main")!;
    expect(within(main).getByTestId("child")).toBeInTheDocument();

    const chrome = Array.from(
      container.querySelectorAll("header, main, footer"),
    ).map((el) => el.tagName);
    expect(chrome).toEqual(["HEADER", "MAIN", "FOOTER"]);
  });
});
