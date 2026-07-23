import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacyPage, { metadata } from "./page";

/**
 * F12 — страница «Политика обработки персональных данных» (152-ФЗ).
 * Симметрична consent/page.test.tsx: та же логика, тот же баланс
 * (структура + якорные 152-ФЗ токены, без проверки точных формулировок).
 */

describe("F12 · страница /privacy", () => {
  it("1. рендерится без ошибок, h1 = «Политика обработки персональных данных»", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Политика обработки персональных данных",
      }),
    ).toBeInTheDocument();
  });

  it("2. metadata.robots — noindex/follow (юридический boilerplate не должен индексироваться отдельно)", () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("3. ссылка «← На главную» ведёт на /", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByRole("link", { name: /на главную/i }),
    ).toHaveAttribute("href", "/");
  });

  it("4. содержит обязательные по 152-ФЗ разделы: правовые основания, трансграничная передача (ст. 12), права субъекта", () => {
    render(<PrivacyPage />);
    expect(screen.getAllByText(/152-ФЗ/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/правовые основания/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/трансграничн/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Роскомнадзор/).length).toBeGreaterThan(0);
  });

  it("5. Telegram-контакт оператора открывается в новой вкладке (noopener+noreferrer)", () => {
    render(<PrivacyPage />);
    const link = screen.getByRole("link", { name: "@AHL2060" });
    expect(link).toHaveAttribute("href", "https://t.me/AHL2060");
    expect(link).toHaveAttribute("target", "_blank");
    const rel = link.getAttribute("rel") ?? "";
    expect(rel).toMatch(/noopener/);
    expect(rel).toMatch(/noreferrer/);
  });

  it.todo("плейсхолдеры [ФИО]/[ИНН]/[e-mail]/[дата публикации] заполнены реальными данными");
});
