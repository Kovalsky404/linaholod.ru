import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Booking } from "./Booking";

/**
 * F12 — ссылки на /consent и /privacy из чекбокса согласия (152-ФЗ).
 * Механика самого чекбокса (блокировка submit, ошибка, фокус) — уже в F6
 * (Booking.test.tsx), здесь не дублируем. Проверяем только то, что F6 не
 * покрывает: сами href этих двух ссылок и их атрибуты открытия в новой
 * вкладке — если они собьются при рефакторинге формы, чекбокс согласия
 * будет юридически ссылаться в никуда, а форма продолжит собирать
 * персональные данные как ни в чём не бывало.
 */

describe("F12 · ссылки на согласие/политику в форме записи", () => {
  it("1. ссылка «согласие на обработку персональных данных» → /consent, новая вкладка, noopener+noreferrer", () => {
    render(<Booking services={[]} />);
    const link = screen.getByRole("link", {
      name: "согласие на обработку персональных данных",
    });
    expect(link).toHaveAttribute("href", "/consent");
    expect(link).toHaveAttribute("target", "_blank");
    const rel = link.getAttribute("rel") ?? "";
    expect(rel).toMatch(/noopener/);
    expect(rel).toMatch(/noreferrer/);
  });

  it("2. ссылка «Политикой» → /privacy, новая вкладка, noopener+noreferrer", () => {
    render(<Booking services={[]} />);
    const link = screen.getByRole("link", { name: "Политикой" });
    expect(link).toHaveAttribute("href", "/privacy");
    expect(link).toHaveAttribute("target", "_blank");
    const rel = link.getAttribute("rel") ?? "";
    expect(rel).toMatch(/noopener/);
    expect(rel).toMatch(/noreferrer/);
  });
});
