import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "./Header";
import { CERTIFICATES_LABEL, NAV_LINKS, RENT } from "@/lib/site-config";

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
    // Прокат — внешний проект, живёт в левой группе рядом с разделами сайта.
    const rent = leftNav().getByRole("link", { name: RENT.label });
    expect(rent).toHaveAttribute("href", RENT.href);
    expect(rent).toHaveAttribute("target", "_blank");
    // rel обязателен у target=_blank: без noopener открытая вкладка получает
    // доступ к window.opener.
    expect(rent).toHaveAttribute("rel", expect.stringContaining("noopener"));

    // Меню закрыто → мобильные дубли вне a11y-дерева, поэтому CTA/лого уникальны
    const cta = screen.getByRole("link", { name: "Записаться" });
    expect(cta).toHaveAttribute("href", "https://t.me/holod_styling"); // внешний чат
    expect(cta).toHaveAttribute("target", "_blank");
    expect(cta).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(
      screen.getByRole("link", { name: "lina H. — на главную" }),
    ).toHaveAttribute("href", "#top");
  });

  it("8. мобильное меню: все NAV_LINKS + Прокат + CTA + Сертификаты", async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(burger());
    const M = inMenu();
    // 5 якорей + Прокат + CTA. Считаем, а не перечисляем: пропавший пункт
    // иначе заметить нечем — на мобильном это единственный способ навигации.
    expect(M.getAllByRole("link")).toHaveLength(NAV_LINKS.length + 2);
    const rent = M.getByRole("link", { name: RENT.label });
    expect(rent).toHaveAttribute("href", RENT.href);
    expect(rent).toHaveAttribute("target", "_blank");
    // Сертификаты — кнопка, а не ссылка: открывает диалог.
    expect(
      M.getByRole("button", { name: CERTIFICATES_LABEL }),
    ).toBeInTheDocument();
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
      "https://t.me/holod_styling",
    );
  });
});

// ───────────────────── Сертификаты ─────────────────────
describe("F8 · модалка сертификатов", () => {
  const openCerts = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: CERTIFICATES_LABEL }));
    return screen.findByRole("dialog");
  };

  it("11. пункт «Сертификаты» открывает диалог с покупкой в Telegram", async () => {
    const user = userEvent.setup();
    render(<Header />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const dialog = await openCerts(user);
    expect(dialog).toHaveAccessibleName(/Подарочный сертификат/);
    // Ключевое обещание пункта: из окна можно уйти в чат. Проверяем адрес,
    // а не факт наличия кнопки, — ссылка «в никуда» выглядела бы так же.
    const buy = within(dialog).getByRole("link", { name: /Telegram/i });
    expect(buy).toHaveAttribute("href", "https://t.me/holod_styling");
    expect(buy).toHaveAttribute("target", "_blank");
    expect(buy).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("12. диалог закрывается по Escape и по кнопке «Закрыть»", async () => {
    const user = userEvent.setup();
    render(<Header />);

    await openCerts(user);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const dialog = await openCerts(user);
    await user.click(within(dialog).getByRole("button", { name: "Закрыть" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("12b. кадр из Sanity попадает в окно; без него — серая заглушка", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Header
        certificatesImage={{ src: "https://cdn.x/cert.jpg", unoptimized: true }}
      />,
    );
    const dialog = await openCerts(user);
    // getAllBy: кадр декоративный (alt=""), поэтому ищем узлом, а не ролью.
    expect(dialog.querySelector("img")).toHaveAttribute(
      "src",
      "https://cdn.x/cert.jpg",
    );

    fireEvent.keyDown(document, { key: "Escape" });
    rerender(<Header />);
    const plain = await openCerts(user);
    // Пока клиент не залил фото, слот обязан показывать заглушку, а не
    // пустоту: без неё колонка схлопнулась бы и раскладка окна поехала.
    expect(plain.querySelector("img")).toHaveAttribute(
      "src",
      "/images/placeholder.svg",
    );
  });

  it("13. из мобильного меню: меню закрывается, диалог открывается", async () => {
    // Обе вещи разом: оставленное открытым меню перекрыло бы диалог собой,
    // а незакрытое body.overflow заблокировало бы страницу после закрытия.
    const user = userEvent.setup();
    render(<Header />);
    await user.click(burger());
    expect(menuEl()).toHaveAttribute("aria-hidden", "false");

    await user.click(
      inMenu().getByRole("button", { name: CERTIFICATES_LABEL }),
    );
    expect(menuEl()).toHaveAttribute("aria-hidden", "true");
    expect(await screen.findByRole("dialog")).toHaveAccessibleName(
      /Подарочный сертификат/,
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
