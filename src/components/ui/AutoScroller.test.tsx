import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AutoScroller } from "./AutoScroller";

/**
 * F15 — контейнер ленты отзывов.
 *
 * Само движение здесь не проверить: в jsdom нет раскладки, scrollWidth и
 * clientWidth всегда 0, поэтому петля не запускается. Дрейф и ручная
 * прокрутка проверяются в браузере — e2e/reviews.spec.ts.
 *
 * Здесь закрыт контракт разметки, который в браузерном тесте не виден:
 * доступность прокручиваемой области и отсутствие утечки rAF.
 */

describe("F15 · AutoScroller", () => {
  const renderOne = () =>
    render(
      <AutoScroller duration={30} direction="left" label="Лента отзывов">
        <div>содержимое</div>
      </AutoScroller>,
    );

  it("a. прокручиваемая область достижима с клавиатуры и названа", () => {
    renderOne();
    const box = screen.getByRole("group", { name: "Лента отзывов" });
    // Без tabIndex прокручиваемый блок недоступен с клавиатуры: стрелки в
    // него не попадут вовсе (WCAG 2.1.1). Регресс молчаливый — мышью и
    // пальцем всё работает, поэтому проверяем явно.
    expect(box).toHaveAttribute("tabindex", "0");
  });

  it("b. классы прокрутки на месте", () => {
    renderOne();
    const box = screen.getByRole("group", { name: "Лента отзывов" });
    // overflow-x-auto — собственно возможность прокрутить руками; без него
    // остаётся только автодрейф, то есть ровно то поведение, от которого
    // уходили.
    expect(box.className).toContain("overflow-x-auto");
    // Чтобы прокрутка ленты до края не листала историю браузера свайпом.
    expect(box.className).toContain("overscroll-x-contain");
  });

  it("c. children рендерятся как есть", () => {
    renderOne();
    expect(screen.getByText("содержимое")).toBeInTheDocument();
  });

  it("d. размонтирование останавливает цикл кадров", () => {
    // Утечка rAF незаметна на одной странице, но лента живёт в SPA-переходах:
    // невыключенный цикл продолжает дёргать scrollLeft у мёртвого узла.
    const cancel = vi.spyOn(globalThis, "cancelAnimationFrame");
    const { unmount } = renderOne();
    unmount();
    expect(cancel).toHaveBeenCalled();
  });
});
