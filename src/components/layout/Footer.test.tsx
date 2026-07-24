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

  it("e. CTA «Записаться» в футере — внешняя ссылка в Telegram", () => {
    render(<Footer />);
    const cta = screen.getByRole("link", { name: "Записаться" });
    expect(cta).toHaveAttribute("href", "https://t.me/holod_styling");
    expect(cta).toHaveAttribute("target", "_blank");
    expect(cta).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});
