import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ConsentPage, { metadata } from "./page";

/**
 * F12 — страница «Согласие на обработку персональных данных» (152-ФЗ).
 * Юридически значимый документ, не обычный контент: чекбокс в форме записи
 * (F6) ссылается сюда, и на этот текст пользователь формально соглашается.
 *
 * Не тестируем точные юридические формулировки целиком (зона юриста/владельца
 * контента — в коде есть TODO про финальную проверку) — только структурные
 * гарантии и якорные токены обязательных по 152-ФЗ разделов, которые не
 * должны бесследно исчезнуть при правке копирайта.
 */

describe("F12 · страница /consent", () => {
  it("1. рендерится без ошибок, h1 = «Согласие на обработку персональных данных»", () => {
    render(<ConsentPage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Согласие на обработку персональных данных",
      }),
    ).toBeInTheDocument();
  });

  it("2. metadata.robots — noindex/follow (юридический boilerplate не должен индексироваться отдельно)", () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("3. ссылка «← На главную» ведёт на /", () => {
    // На странице ЕСТЬ вторая ссылка на "/" (инлайновая "linaholod.ru" в
    // тексте согласия) — берём строго по имени back-link, а не по href.
    render(<ConsentPage />);
    expect(
      screen.getByRole("link", { name: /на главную/i }),
    ).toHaveAttribute("href", "/");
  });

  it("4. перекрёстная ссылка ведёт на действующую Политику (/privacy)", () => {
    render(<ConsentPage />);
    expect(
      screen.getByRole("link", { name: /Политикой обработки персональных данных/ }),
    ).toHaveAttribute("href", "/privacy");
  });

  it("5. содержит обязательную по ст. 12 152-ФЗ формулировку о трансграничной передаче", () => {
    render(<ConsentPage />);
    // "трансграничн" встречается и в заголовке-<strong>, и в теле абзаца
    // («трансграничную передачу») — оба узла валидны, берём по факту наличия.
    // (Отдельно не якорим "Telegram" — слово встречается в 3+ местах страницы
    // и осталось бы зелёным, даже если весь абзац про трансграничную передачу
    // вырезать; "трансграничн" — единственный анкер, который реально ловит
    // удаление именно этого раздела.)
    expect(screen.getAllByText(/трансграничн/i).length).toBeGreaterThan(0);
  });

  it("6. Telegram-контакт оператора открывается в новой вкладке (noopener+noreferrer)", () => {
    render(<ConsentPage />);
    const link = screen.getByRole("link", { name: "@AHL2060" });
    expect(link).toHaveAttribute("href", "https://t.me/AHL2060");
    expect(link).toHaveAttribute("target", "_blank");
    const rel = link.getAttribute("rel") ?? "";
    expect(rel).toMatch(/noopener/);
    expect(rel).toMatch(/noreferrer/);
  });

  // Launch-gate, не падающий тест: поля [ФИО]/[ИНН]/[e-mail] сейчас
  // намеренно не заполнены (см. TODO в page.tsx), заполнит владелец/юрист
  // перед продом. Флажок, чтобы про это не забыли — не проверка регрессии.
  it.todo("плейсхолдеры [ФИО]/[ИНН]/[e-mail для обращений] заполнены реальными данными");
});
