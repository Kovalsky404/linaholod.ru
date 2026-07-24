import { describe, expect, it, vi } from "vitest";
import { render, within } from "@testing-library/react";
import type { PortfolioView, ServiceView, SiteSettingsView } from "@/sanity/types";
import type { Review } from "@/lib/reviews";

/**
 * F11 — сборка главной страницы (src/app/(site)/page.tsx).
 *
 * Home — async Server Component: Promise.all четырёх геттеров из
 * @/sanity/content → пропсы в 7 секций. Сам маппинг Sanity↔фолбэк уже жёстко
 * покрыт в F4 (content.test.ts) — здесь НЕ дублируем. Проверяем только шов
 * "вайринга": что конкретное значение из геттера долетает до конкретной
 * секции, что порядок секций не ломается и что services не потерялись при
 * прокидывании сразу в две секции (Services и Booking).
 *
 * Мокаем ЦЕЛИКОМ @/sanity/content (значит "server-only" внутри content.ts
 * никогда не импортируется — мокать его отдельно не нужно). Секции — НЕ
 * мокаем, рендерим по-настоящему, иначе тест ничего не докажет про вайринг.
 *
 * Готчи: About (десктоп+мобайл дублируются в DOM) и Reviews (marquee дублирует
 * каждую карточку с aria-hidden копией) требуют getAllByText, а не getByText.
 */

vi.mock("@/sanity/content", () => ({
  getServices: vi.fn(),
  getPortfolio: vi.fn(),
  getReviews: vi.fn(),
  getSiteSettings: vi.fn(),
}));

import {
  getPortfolio,
  getReviews,
  getServices,
  getSiteSettings,
} from "@/sanity/content";
import Home from "./page";

const getServicesMock = vi.mocked(getServices);
const getPortfolioMock = vi.mocked(getPortfolio);
const getReviewsMock = vi.mocked(getReviews);
const getSiteSettingsMock = vi.mocked(getSiteSettings);

const MOCK_SERVICE: ServiceView = {
  slug: "test-service",
  title: "УНИКАЛЬНАЯ-УСЛУГА-42",
  price: "12 345 ₽",
  priceValue: 12345,
  description: "Описание услуги",
  image: { src: "https://cdn.example/service.jpg", unoptimized: true },
};

const MOCK_PORTFOLIO: PortfolioView = {
  id: "p1",
  number: "#7",
  title: "УНИКАЛЬНАЯ-РАБОТА-77",
  shoot: "Shoot X",
  description: "Описание работы",
  date: "Март 2026",
  cover: "https://cdn.example/cover-450x487.jpg",
  gallery: ["https://cdn.example/cover-450x487.jpg"],
  unoptimized: true,
};

const MOCK_REVIEW: Review = {
  author: "УНИКАЛЬНЫЙ-АВТОР-99",
  text: "УНИКАЛЬНЫЙ-ТЕКСТ-ОТЗЫВА-99",
  rating: 5,
};

const MOCK_SETTINGS: SiteSettingsView = {
  heroImage: { src: "https://cdn.example/hero-uniq.jpg", unoptimized: true },
  aboutText: "УНИКАЛЬНЫЙ-ABOUT-ТЕКСТ-55",
  whyMeTitle: "УНИКАЛЬНЫЙ-WHY-ЗАГОЛОВОК-55",
  whyMeText: "УНИКАЛЬНЫЙ-WHY-ТЕКСТ-55",
  whyMeImage: { src: "https://cdn.example/whyme-uniq.jpg", unoptimized: true },
  servicesTerms: "УНИКАЛЬНЫЕ-УСЛОВИЯ-55",
  bookingIntro: "УНИКАЛЬНЫЙ-INTRO-ТЕКСТ-55",
};

function mockAllData({
  services = [MOCK_SERVICE],
  portfolio = [MOCK_PORTFOLIO],
  reviews = [MOCK_REVIEW],
  settings = MOCK_SETTINGS,
}: {
  services?: ServiceView[];
  portfolio?: PortfolioView[];
  reviews?: Review[];
  settings?: SiteSettingsView | null;
} = {}) {
  getServicesMock.mockResolvedValue(services);
  getPortfolioMock.mockResolvedValue(portfolio);
  getReviewsMock.mockResolvedValue(reviews);
  getSiteSettingsMock.mockResolvedValue(settings);
}

/** Home — async Server Component: render() не умеет ждать промис сам. */
async function renderHome() {
  return render(await Home());
}

const heroSectionOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[aria-label="Главное изображение"]')!;

// ───────────────────── Порядок и присутствие секций ─────────────────────
describe("F11 · порядок и присутствие секций", () => {
  it("1. рендерит все 7 секций в требуемом порядке (Hero→About→Portfolio→Services→WhyMe→Reviews→Booking)", async () => {
    mockAllData();
    const { container } = await renderHome();

    const sections = Array.from(container.querySelectorAll("section"));
    const ids = sections.map((s) => s.id || s.getAttribute("aria-label"));

    expect(ids).toEqual([
      "Главное изображение",
      "about",
      "portfolio",
      "services",
      "why",
      "reviews",
      "book",
    ]);
  });
});

// ───────────────── Данные из Sanity доходят до своей секции ─────────────────
describe("F11 · данные из Sanity доходят до своей секции", () => {
  it("2. Hero: heroImage.src попадает в <img> секции героя", async () => {
    mockAllData();
    const { container } = await renderHome();

    const img = heroSectionOf(container).querySelector("img");
    expect(img).toHaveAttribute("src", MOCK_SETTINGS.heroImage!.src);
  });

  it("3. About: aboutText попадает в секцию #about", async () => {
    mockAllData();
    const { container } = await renderHome();

    const about = container.querySelector<HTMLElement>("#about")!;
    // Десктоп + мобайл блоки оба в DOM (jsdom не применяет CSS-видимость).
    expect(
      within(about).getAllByText(MOCK_SETTINGS.aboutText!).length,
    ).toBeGreaterThan(0);
  });

  it("4. Portfolio: работа из getPortfolio попадает в секцию #portfolio", async () => {
    mockAllData();
    const { container } = await renderHome();

    const portfolio = container.querySelector<HTMLElement>("#portfolio")!;
    expect(
      within(portfolio).getByRole("button", {
        name: new RegExp(`Открыть работу: ${MOCK_PORTFOLIO.title}`),
      }),
    ).toBeInTheDocument();
  });

  it("5. Services: услуга (title+price) и servicesTerms попадают в секцию #services", async () => {
    mockAllData();
    const { container } = await renderHome();

    const services = container.querySelector<HTMLElement>("#services")!;
    expect(within(services).getByText(MOCK_SERVICE.title)).toBeInTheDocument();
    expect(within(services).getByText(MOCK_SERVICE.price)).toBeInTheDocument();
    expect(
      within(services).getByText(MOCK_SETTINGS.servicesTerms!),
    ).toBeInTheDocument();
  });

  it("6. WhyMe: whyMeTitle попадает ИМЕННО в заголовок, whyMeText — в текст, whyMeImage — в <img>", async () => {
    mockAllData();
    const { container } = await renderHome();

    const why = container.querySelector<HTMLElement>("#why")!;
    // getByRole("heading") вместо getByText: whyMeTitle и whyMeText — два
    // разных поля, оба попадающих в одну секцию. Обычный getByText("где-то
    // внутри #why") не отличит "заголовок ↔ текст переставлены местами" от
    // корректного вайринга — оба варианта содержат обе строки. Пиновка к
    // роли heading ловит именно такую перестановку.
    expect(
      within(why).getByRole("heading", { name: MOCK_SETTINGS.whyMeTitle! }),
    ).toBeInTheDocument();
    expect(within(why).getByText(MOCK_SETTINGS.whyMeText!)).toBeInTheDocument();
    expect(why.querySelector("img")).toHaveAttribute(
      "src",
      MOCK_SETTINGS.whyMeImage!.src,
    );
  });

  it("7. Reviews: отзыв из getReviews (автор+текст) попадает в секцию #reviews", async () => {
    mockAllData();
    const { container } = await renderHome();

    const reviews = container.querySelector<HTMLElement>("#reviews")!;
    // Marquee дублирует каждую карточку (оригинал + aria-hidden копия).
    expect(
      within(reviews).getAllByText(MOCK_REVIEW.text).length,
    ).toBeGreaterThan(0);
    expect(
      within(reviews).getAllByText(MOCK_REVIEW.author).length,
    ).toBeGreaterThan(0);
  });

  it("8. Booking: bookingIntro попадает в секцию #book", async () => {
    mockAllData();
    const { container } = await renderHome();

    const book = container.querySelector<HTMLElement>("#book")!;
    expect(
      within(book).getByText(MOCK_SETTINGS.bookingIntro!),
    ).toBeInTheDocument();
  });
});

// ───────────── settings=null — страница жива, секции на фолбэках ─────────────
describe("F11 · settings=null — страница не падает, секции на своих фолбэках", () => {
  it("10. рендерит страницу без ошибок и показывает дефолтные тексты/картинку секций", async () => {
    mockAllData({ settings: null });
    const { container } = await renderHome();

    // About — фолбэк-текст живёт в самой секции (не в content.ts).
    expect(
      within(container.querySelector<HTMLElement>("#about")!).getAllByText(
        /Меня зовут Лина, я стилист из Москвы/,
      ).length,
    ).toBeGreaterThan(0);

    // WhyMe — дефолтный заголовок секции.
    expect(
      within(container.querySelector<HTMLElement>("#why")!).getByText("Почему я?"),
    ).toBeInTheDocument();

    // Booking — дефолтный intro-текст (форма заменена ссылкой в Telegram).
    expect(
      within(container.querySelector<HTMLElement>("#book")!).getByText(
        /Напишите мне в Telegram/,
      ),
    ).toBeInTheDocument();

    // Hero — плейсхолдер вместо героя из Sanity.
    const heroImg = heroSectionOf(container).querySelector("img");
    expect(heroImg).toHaveAttribute("src", "/images/placeholder.svg");
  });
});
