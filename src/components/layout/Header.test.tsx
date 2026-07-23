import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "./Header";
import { NAV_LINKS } from "@/lib/site-config";

/**
 * F8 — шапка + мобильное меню (RTL, jsdom).
 * Состояние открыто/закрыто доказываем БЕЗ классов (css:false их инертит):
 * aria-expanded (бургер) + aria-hidden (#mobile-menu) + body.overflow.
 * Дубли ссылок (десктоп + мобайл) скоупим по имени <nav>.
 */

const burger = () => screen.getByRole("button", { name: /меню/i });
const menuEl = () => document.getElementById("mobile-menu")!;
const inMenu = () =>
  within(screen.getByRole("navigation", { name: "Мобильная навигация" }));
const leftNav = () =>
  within(screen.getByRole("navigation", { name: "Основная навигация" }));
const rightNav = () =>
  within(screen.getByRole("navigation", { name: "Дополнительная навигация" }));

// window.scrollY не мок — сбрасываем вручную, иначе mount-onScroll утечёт scrolled.
function setScrollY(v: number) {
  Object.defineProperty(window, "scrollY", {
    value: v,
    writable: true,
    configurable: true,
  });
}
beforeEach(() => setScrollY(0));
afterEach(() => setScrollY(0));

// ───────────────────── Тоггл и состояние ─────────────────────
describe("F8 · тоггл меню", () => {
  it("1. бургер: закрыто → открыто → закрыто (aria-expanded + aria-hidden)", async () => {
    const user = userEvent.setup();
    render(<Header />);
    expect(burger()).toHaveAttribute("aria-expanded", "false");
    expect(menuEl()).toHaveAttribute("aria-hidden", "true");

    await user.click(burger());
    expect(burger()).toHaveAttribute("aria-expanded", "true");
    expect(menuEl()).toHaveAttribute("aria-hidden", "false");

    await user.click(burger());
    expect(burger()).toHaveAttribute("aria-expanded", "false");
    expect(menuEl()).toHaveAttribute("aria-hidden", "true");
  });

  it("2. открытие блокирует скролл body, закрытие восстанавливает", async () => {
    const user = userEvent.setup();
    render(<Header />);
    expect(document.body.style.overflow).toBe("");
    await user.click(burger());
    expect(document.body.style.overflow).toBe("hidden");
    await user.click(burger());
    expect(document.body.style.overflow).toBe("");
  });

  it("3. Escape закрывает открытое меню (полный сброс)", async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(burger());
    await user.keyboard("{Escape}");
    expect(burger()).toHaveAttribute("aria-expanded", "false");
    expect(menuEl()).toHaveAttribute("aria-hidden", "true");
    expect(document.body.style.overflow).toBe("");
  });

  it("3b. Escape при закрытом — no-op (без ошибок)", async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.keyboard("{Escape}");
    expect(burger()).toHaveAttribute("aria-expanded", "false");
  });
});

// ───────────────────── Закрытие по клику внутри меню ─────────────────────
describe("F8 · закрытие по навигации (скоуп в меню)", () => {
  it("4. клик по пункту ВНУТРИ меню закрывает его", async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(burger());
    await user.click(inMenu().getByRole("link", { name: "Обо мне" }));
    expect(burger()).toHaveAttribute("aria-expanded", "false");
    expect(menuEl()).toHaveAttribute("aria-hidden", "true");
    expect(document.body.style.overflow).toBe("");
  });

  it("5. клик по CTA внутри меню закрывает его", async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(burger());
    await user.click(inMenu().getByRole("link", { name: "Записаться" }));
    expect(burger()).toHaveAttribute("aria-expanded", "false");
    expect(document.body.style.overflow).toBe("");
  });
});

// ───────────────────── A11y-проводка и контент ─────────────────────
describe("F8 · a11y-проводка и контент", () => {
  it("6. aria-controls указывает на меню, aria-label отражает состояние", async () => {
    const user = userEvent.setup();
    render(<Header />);
    expect(burger()).toHaveAttribute("aria-controls", "mobile-menu");
    expect(burger()).toHaveAttribute("aria-label", "Открыть меню");
    await user.click(burger());
    expect(burger()).toHaveAttribute("aria-label", "Закрыть меню");
    await user.click(burger());
    expect(burger()).toHaveAttribute("aria-label", "Открыть меню");
  });

  it("7. десктоп: раскладка LEFT/RIGHT + CTA + лого (href из конфига)", () => {
    render(<Header />);
    // LEFT: Обо мне / Портфолио / Услуги
    expect(leftNav().getByRole("link", { name: "Обо мне" })).toHaveAttribute(
      "href",
      "#about",
    );
    expect(leftNav().getByRole("link", { name: "Портфолио" })).toHaveAttribute(
      "href",
      "#portfolio",
    );
    expect(leftNav().getByRole("link", { name: "Услуги" })).toHaveAttribute(
      "href",
      "#services",
    );
    // RIGHT: Отзывы / Контакты
    expect(rightNav().getByRole("link", { name: "Отзывы" })).toHaveAttribute(
      "href",
      "#reviews",
    );
    expect(rightNav().getByRole("link", { name: "Контакты" })).toHaveAttribute(
      "href",
      "#contacts",
    );
    // Меню закрыто → мобильные дубли вне a11y-дерева, поэтому CTA/лого уникальны
    expect(screen.getByRole("link", { name: "Записаться" })).toHaveAttribute(
      "href",
      "#book",
    );
    expect(
      screen.getByRole("link", { name: "lina H. — на главную" }),
    ).toHaveAttribute("href", "#top");
  });

  it("8. мобильное меню: все NAV_LINKS + CTA (при открытии)", async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(burger());
    const M = inMenu();
    expect(M.getAllByRole("link")).toHaveLength(NAV_LINKS.length + 1); // 5 + CTA
    expect(M.getByRole("link", { name: "Обо мне" })).toHaveAttribute(
      "href",
      "#about",
    );
    expect(M.getByRole("link", { name: "Контакты" })).toHaveAttribute(
      "href",
      "#contacts",
    );
    expect(M.getByRole("link", { name: "Записаться" })).toHaveAttribute(
      "href",
      "#book",
    );
  });
});

// ───────────────────── Структурный инвариант + scrolled ─────────────────────
describe("F8 · структура и scrolled", () => {
  it("9. #mobile-menu — СИБЛИНГ полосы шапки, не потомок блюр-контейнера", () => {
    render(<Header />);
    const menu = menuEl();
    const header = menu.closest("header")!;
    const bar = header.firstElementChild!; // полоса с backdrop-blur
    expect(bar).not.toBe(menu);
    expect(bar.contains(menu)).toBe(false); // меню НЕ под блюром (фикс fixed-бага)
    expect(menu.parentElement).toBe(header); // оба — прямые дети <header>
  });

  it("10. data-scrolled: порог >8 и ДВУСТОРОННИЙ переход (не латч)", () => {
    render(<Header />);
    const bar = document.querySelector("header")!.firstElementChild!;
    expect(bar).toHaveAttribute("data-scrolled", "false"); // scrollY=0 на mount

    setScrollY(8);
    fireEvent.scroll(window);
    expect(bar).toHaveAttribute("data-scrolled", "false"); // ровно порог → ещё false

    setScrollY(9);
    fireEvent.scroll(window);
    expect(bar).toHaveAttribute("data-scrolled", "true"); // выше порога

    setScrollY(0);
    fireEvent.scroll(window);
    expect(bar).toHaveAttribute("data-scrolled", "false"); // вверх → сбросилось, не латч
  });
});
