import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Booking } from "./Booking";

/**
 * Секция «Записаться» ПОСЛЕ удаления формы: приглашение + шаги + соцсети +
 * кнопка в Telegram. Формы/полей/согласия быть НЕ должно (сайт не собирает ПД).
 */

const TG = "https://t.me/holod_styling";

describe("Секция «Записаться» → Telegram (без формы)", () => {
  it("1. заголовок секции, шаги и дефолтный intro", () => {
    render(<Booking />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Записаться" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Напишите мне в Telegram/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Пишете в Telegram" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Знакомство" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Работа" })).toBeInTheDocument();
  });

  it("2. intro-проп переопределяет дефолт", () => {
    render(<Booking intro="Кастомное приглашение из Sanity" />);
    expect(
      screen.getByText("Кастомное приглашение из Sanity"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Напишите мне в Telegram/)).not.toBeInTheDocument();
  });

  it("3. кнопка «Записаться» ведёт в Telegram (внешняя, новая вкладка)", () => {
    render(<Booking />);
    const cta = screen.getByRole("link", { name: /Записаться/i });
    expect(cta).toHaveAttribute("href", TG);
    expect(cta).toHaveAttribute("target", "_blank");
    expect(cta).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("4. формы НЕТ: ни полей ввода, ни чекбокса, ни кнопки отправки", () => {
    render(<Booking />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument(); // никаких submit/select
    expect(screen.queryByText(/согласие на обработку/i)).not.toBeInTheDocument();
  });

  it("5. соцсети — внешние ссылки (Telegram/Instagram)", () => {
    render(<Booking />);
    const tg = screen.getByRole("link", { name: "Telegram" });
    expect(tg).toHaveAttribute("target", "_blank");
    expect(tg).toHaveAttribute("href", expect.stringContaining("t.me"));
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "target",
      "_blank",
    );
  });
});
