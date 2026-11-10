import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  WELCOME_OFFER_DELAY_MS,
  WELCOME_OFFER_KEY,
  WelcomeOffer,
} from "./WelcomeOffer";

/**
 * Приветственное окно «−10% на первый заказ».
 *
 * Обещания, которые проверяем:
 * - показывается один раз на браузер (отметка — в момент показа);
 * - не всплывает мгновенно, а после паузы;
 * - не перебивает уже открытое меню или окно;
 * - без localStorage не показывается вовсе (иначе всплывало бы на каждой
 *   странице — запомнить отказ негде);
 * - кнопка ведёт в рабочий Telegram с готовым текстом про скидку.
 */

const dialog = () => screen.queryByRole("dialog");
const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  document.body.style.overflow = "";
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.style.overflow = "";
});

describe("WelcomeOffer", () => {
  it("1. первый визит: после паузы окно открывается и ставит отметку", () => {
    render(<WelcomeOffer />);
    expect(dialog()).not.toBeInTheDocument(); // не мгновенно

    wait(WELCOME_OFFER_DELAY_MS - 100);
    expect(dialog()).not.toBeInTheDocument();

    wait(200);
    expect(dialog()).toHaveAccessibleName("Скидка 10% на первый заказ");
    expect(window.localStorage.getItem(WELCOME_OFFER_KEY)).not.toBeNull();
  });

  it("2. повторный визит (отметка есть) — окна нет", () => {
    window.localStorage.setItem(WELCOME_OFFER_KEY, "1");
    render(<WelcomeOffer />);
    wait(WELCOME_OFFER_DELAY_MS * 5);
    expect(dialog()).not.toBeInTheDocument();
  });

  it("3. отметка ставится при ПОКАЗЕ: после перезагрузки с открытым окном оно не вернётся", () => {
    const { unmount } = render(<WelcomeOffer />);
    wait(WELCOME_OFFER_DELAY_MS + 10);
    expect(dialog()).toBeInTheDocument();
    unmount(); // «перезагрузка», окно так и не закрыли

    render(<WelcomeOffer />);
    wait(WELCOME_OFFER_DELAY_MS * 3);
    expect(dialog()).not.toBeInTheDocument();
  });

  it("4. пока открыто меню/другое окно (скролл заблокирован) — ждёт", () => {
    document.body.style.overflow = "hidden";
    render(<WelcomeOffer />);
    wait(WELCOME_OFFER_DELAY_MS * 3);
    expect(dialog()).not.toBeInTheDocument();
    // Отметку не ставим, пока окно не показано: иначе человек его не увидит.
    expect(window.localStorage.getItem(WELCOME_OFFER_KEY)).toBeNull();

    document.body.style.overflow = "";
    wait(2100);
    expect(dialog()).toBeInTheDocument();
  });

  it("5. localStorage недоступен — окно не показывается вовсе", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    render(<WelcomeOffer />);
    wait(WELCOME_OFFER_DELAY_MS * 3);
    expect(dialog()).not.toBeInTheDocument();
  });

  it("6. кнопка ведёт в рабочий Telegram с готовым текстом про скидку", () => {
    render(<WelcomeOffer />);
    wait(WELCOME_OFFER_DELAY_MS + 10);
    const cta = screen.getByRole("link", { name: /Получить скидку/ });
    const url = new URL(cta.getAttribute("href")!);
    expect(url.origin + url.pathname).toBe("https://t.me/holod_styling");
    expect(url.searchParams.get("text")).toMatch(/скидк\S* 10%/);
    expect(cta).toHaveAttribute("target", "_blank");
    expect(cta).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("7. «Не сейчас» и Escape закрывают окно", () => {
    const { unmount } = render(<WelcomeOffer />);
    wait(WELCOME_OFFER_DELAY_MS + 10);
    fireEvent.click(screen.getByRole("button", { name: "Не сейчас" }));
    expect(dialog()).not.toBeInTheDocument();
    unmount();

    window.localStorage.clear();
    render(<WelcomeOffer />);
    wait(WELCOME_OFFER_DELAY_MS + 10);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(dialog()).not.toBeInTheDocument();
  });
});
