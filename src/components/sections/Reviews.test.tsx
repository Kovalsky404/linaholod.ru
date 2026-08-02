import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Reviews } from "./Reviews";
import type { Review } from "@/lib/reviews";

/**
 * F15 — секция «Отзывы».
 *
 * Главное, что здесь проверяется, — контракт дублирования: бесшовная петля в
 * AutoScroller держится на том, что контент лежит РОВНО ДВАЖДЫ и вторая копия
 * скрыта от скринридера. Сломается дубль — лента будет дёргаться на стыке,
 * причём молча: ни один визуальный тест этого не поймает.
 */

const r = (author: string, rating = 5): Review => ({
  author,
  text: `Текст отзыва от ${author}`,
  rating,
});
const four = [r("Анна"), r("Борис"), r("Вера"), r("Глеб")];

describe("F15 · Reviews — ленты", () => {
  it("a. две ленты, отзывы поделены между ними без потерь и без дублей", () => {
    render(<Reviews reviews={four} />);
    const rows = screen.getAllByRole("group", { name: /Отзывы клиентов/ });
    expect(rows).toHaveLength(2);

    // Каждый автор ровно в одной ленте: при кривом делении половина отзывов
    // просто исчезла бы со страницы, и заметить это можно только счётом.
    for (const { author } of four) {
      const inRow = rows.filter(
        (row) => within(row).queryAllByText(new RegExp(author)).length > 0,
      );
      expect(inRow, `автор ${author}`).toHaveLength(1);
    }
  });

  it("b. контент продублирован ровно дважды — на этом держится петля", () => {
    render(<Reviews reviews={four} />);
    // Анна попадает в первую ленту; внутри неё она обязана встретиться
    // дважды: оригинал и дубль. Одна копия — рваный стык, три — лишний вес.
    expect(screen.getAllByText(/Текст отзыва от Анна/)).toHaveLength(2);
  });

  it("c. дубль скрыт от скринридера, оригинал — нет", () => {
    const { container } = render(<Reviews reviews={four} />);
    // Ищем карточки узлом, а не ролью: getByRole по умолчанию не видит
    // содержимое aria-hidden — именно ради этого aria-hidden и стоит.
    const hidden = Array.from(
      container.querySelectorAll("[aria-hidden='true']"),
    ).filter((el) => el.querySelectorAll("figure").length > 0);
    // Ровно две скрытые копии — по одной на ленту. Если бы aria-hidden
    // потерялся, скринридер зачитал бы все отзывы по два раза.
    expect(hidden).toHaveLength(2);

    // И проверяем обратное: оригиналы скринридеру доступны. Без этого тест
    // прошёл бы и при aria-hidden на ОБЕИХ копиях — отзывы исчезли бы из
    // озвучки целиком.
    expect(screen.getAllByRole("figure").length).toBe(four.length);
  });

  it("d. один отзыв не ломает деление на две ленты", () => {
    // Граничный случай реальных данных: половина от 1 — это 1 и 0.
    render(<Reviews reviews={[r("Одинокий")]} />);
    expect(
      screen.getAllByRole("group", { name: /Отзывы клиентов/ }),
    ).toHaveLength(2);
    expect(screen.getAllByText(/Текст отзыва от Одинокий/)).toHaveLength(2);
  });
});
