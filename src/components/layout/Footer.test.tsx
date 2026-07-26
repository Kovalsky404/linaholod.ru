import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "./Footer";

/**
 * F13 — мердж соцссылок в футере: override из Sanity (siteSettings) должен
 * побеждать статический дефолт из site-config ПОКЛЮЧЕВО (не all-or-nothing),
 * а пустая строка/undefined — не затирать дефолт пустотой. Реальный риск:
 * сломанный мердж либо теряет реальные ссылки клиента (показывает
 * плейсхолдер вместо аккаунта — прямая потеря лида), либо наоборот стирает
 * рабочий дефолт пустым значением из недозаполненной Studio.
 */

describe("F13 · Footer — мердж соцссылок (Sanity override ↔ дефолт)", () => {
  it("a. social не задан (проп опущен И social=undefined) → все дефолты SOCIAL_LINKS, без краша", () => {
    const { rerender } = render(<Footer />);
    expect(screen.getByRole("link", { name: "Telegram" })).toHaveAttribute(
      "href",
      "https://t.me/AHL2060",
    );
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/_bulochka__s__makom_/",
    );
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      "#",
    );

    rerender(<Footer social={undefined} />);
    expect(screen.getByRole("link", { name: "Telegram" })).toHaveAttribute(
      "href",
      "https://t.me/AHL2060",
    );
  });

  it("b. полный override — все три ключа побеждают дефолт", () => {
    render(
      <Footer
        social={{
          telegram: "https://t.me/realaccount",
          instagram: "https://instagram.com/realaccount",
          whatsapp: "https://wa.me/79990000000",
        }}
      />,
    );
    expect(screen.getByRole("link", { name: "Telegram" })).toHaveAttribute(
      "href",
      "https://t.me/realaccount",
    );
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://instagram.com/realaccount",
    );
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      "https://wa.me/79990000000",
    );
  });

  it("c. поключевой override — whatsapp остаётся дефолтным, пока telegram/instagram уже реальные", () => {
    render(
      <Footer
        social={{
          telegram: "https://t.me/realaccount",
          instagram: "https://instagram.com/realaccount",
        }}
      />,
    );
    expect(screen.getByRole("link", { name: "Telegram" })).toHaveAttribute(
      "href",
      "https://t.me/realaccount",
    );
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://instagram.com/realaccount",
    );
    // Не all-or-nothing: whatsapp override отсутствует → дефолт-заглушка "#".
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      "#",
    );
  });

  it("d. falsy override (пустая строка) игнорируется — дефолт не затирается пустотой", () => {
    render(<Footer social={{ telegram: "" }} />);
    expect(screen.getByRole("link", { name: "Telegram" })).toHaveAttribute(
      "href",
      "https://t.me/AHL2060",
    );
  });

  it("d2. порядок в DOM: соцсети ПЕРЕД кнопкой, без reverse/order", () => {
    // Регресс-лок на доступность: раньше здесь стоял flex-col-reverse — визуально
    // верно, но Tab и скринридер шли в обратном порядке (WCAG 2.4.3 / 1.3.2).
    // Порядок обхода задаётся ТОЛЬКО разметкой, поэтому проверяем и её, и
    // отсутствие CSS-переворотов, которые снова рассинхронизировали бы порядок.
    const { container } = render(<Footer />);
    const links = Array.from(container.querySelectorAll("a"))
      .map((a) => a.getAttribute("aria-label") ?? a.textContent?.trim() ?? "")
      .filter((t) =>
        ["Telegram", "Instagram", "WhatsApp", "Записаться"].includes(t),
      );
    expect(links).toEqual(["Telegram", "Instagram", "WhatsApp", "Записаться"]);

    // Якорь по РОЛИ, а не по href: ссылка на Telegram в соцсетях настраивается
    // из Sanity и может совпасть с адресом CTA — тогда querySelector нашёл бы
    // не ту ссылку, её родителем оказался бы <li> без классов, и проверка ниже
    // прошла бы впустую.
    const cta = screen.getByRole("link", { name: "Записаться" });
    const block = cta.parentElement!;
    const list = container.querySelector("ul")!;
    // order- якорим началом строки или разделителем: без этого подстрока
    // «border-» (например в border-t) ложно считалась бы переворотом порядка.
    const reversal =
      /flex-col-reverse|flex-row-reverse|flex-wrap-reverse|(^|[\s:])order-/;
    // Перевернуть порядок можно на любом уровне от общего флекс-контейнера
    // (<nav>) до отдельного <li> — проверяем всю цепочку, иначе переворот,
    // добавленный выше по дереву, прошёл бы мимо теста.
    const nav = container.querySelector("nav")!;
    expect(nav.className).not.toMatch(reversal);
    expect(block.className).not.toMatch(reversal);
    expect(list.className).not.toMatch(reversal);
    for (const li of list.querySelectorAll("li")) {
      expect(li.className).not.toMatch(reversal);
    }
    expect(cta.className).not.toMatch(reversal);
  });

  it("e. CTA «Записаться» в футере — внешняя ссылка в Telegram", () => {
    render(<Footer />);
    const cta = screen.getByRole("link", { name: "Записаться" });
    expect(cta).toHaveAttribute("href", "https://t.me/holod_styling");
    expect(cta).toHaveAttribute("target", "_blank");
    expect(cta).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});
