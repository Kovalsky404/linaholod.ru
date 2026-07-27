import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { About } from "./About";
import type { ResolvedImage } from "@/sanity/types";

/**
 * F14 — коллаж «Обо мне»: 5 слотов из Sanity (поле aboutGallery).
 *
 * Порядок в CMS задаётся перетаскиванием, и он ДОЛЖЕН совпадать с порядком
 * слотов на сайте — иначе клиент двигает картинки в Studio, а на странице
 * они встают иначе, и это невозможно объяснить. Раскладка десктопа и
 * мобайла разная, поэтому проверяем обе: один и тот же кадр обязан попасть
 * в соответствующий слот в каждой.
 *
 * jsdom-оговорка: обе раскладки присутствуют в DOM одновременно (скрытие
 * чисто CSS-ное, а CSS здесь инертен), поэтому каждый кадр встречается
 * дважды — считаем через getAllBy* и сверяем ПОРЯДОК, а не количество.
 */

const PLACEHOLDER = "/images/placeholder.svg";
const shot = (n: number): ResolvedImage => ({
  src: `https://cdn.x/shot${n}.jpg`,
  unoptimized: true, // src отдаётся next/image как есть → сверяем URL напрямую
});
const five = [shot(1), shot(2), shot(3), shot(4), shot(5)];

/** src всех картинок секции в порядке DOM. */
const srcs = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("img")).map((i) =>
    i.getAttribute("src"),
  );

describe("F14 · About — коллаж из Sanity", () => {
  it("a. без галереи — пять заглушек в каждой раскладке, вёрстка не пустая", () => {
    const { container } = render(<About />);
    const all = srcs(container);
    // 5 слотов × 2 раскладки. Если бы слот отвалился, число бы поехало.
    expect(all).toHaveLength(10);
    expect(all.every((s) => s === PLACEHOLDER)).toBe(true);
  });

  it("b. порядок из CMS = порядок слотов на десктопе", () => {
    const { container } = render(<About gallery={five} />);
    // Десктопная раскладка идёт в DOM первой: две маленькие слева, большая
    // в центре, две маленькие справа снизу.
    expect(srcs(container).slice(0, 5)).toEqual([
      shot(1).src,
      shot(2).src,
      shot(3).src,
      shot(4).src,
      shot(5).src,
    ]);
  });

  it("c. на мобайле те же кадры, но раскладка иная: большая идёт первой", () => {
    const { container } = render(<About gallery={five} />);
    // Мобильный блок: сначала крупный кадр (слот 3), затем сетка 1,2,4,5.
    // Именно это перемешивание и есть причина проверять обе раскладки —
    // одинаковая проверка «просто пять картинок» его бы не заметила.
    expect(srcs(container).slice(5)).toEqual([
      shot(3).src,
      shot(1).src,
      shot(2).src,
      shot(4).src,
      shot(5).src,
    ]);
  });

  it("d. неполный набор: залитые кадры на своих местах, остальные — заглушки", () => {
    // Промежуточное состояние при заполнении Studio. Слот 3 (большой) обязан
    // остаться пустым, а не подтянуть следующий по счёту кадр: сдвиг сломал
    // бы соответствие между порядком в CMS и порядком на сайте.
    const { container } = render(<About gallery={[shot(1), shot(2)]} />);
    expect(srcs(container).slice(0, 5)).toEqual([
      shot(1).src,
      shot(2).src,
      PLACEHOLDER,
      PLACEHOLDER,
      PLACEHOLDER,
    ]);
  });

  it("e. лишние кадры сверх пяти игнорируются, а не ломают коллаж", () => {
    // Валидация в схеме стоит на max(5), но данные могли быть залиты до неё.
    const { container } = render(<About gallery={[...five, shot(6)]} />);
    const all = srcs(container);
    expect(all).toHaveLength(10);
    expect(all).not.toContain(shot(6).src);
  });

  it("f. alt: у настоящего кадра осмысленный, у заглушки пустой", () => {
    // Заглушка — декоративный серый прямоугольник. Описывать её как
    // фотографию Лины значит врать скринридеру.
    const { rerender } = render(<About gallery={five} />);
    expect(
      screen.getAllByAltText(/Лина Холод — крупный образ/).length,
    ).toBeGreaterThan(0);

    rerender(<About />);
    expect(screen.queryByAltText(/Лина Холод/)).not.toBeInTheDocument();
  });

  it("g. текст секции продолжает работать рядом с галереей", () => {
    render(<About content={{ text: "ТЕКСТ-ПРО-МЕНЯ-42" }} gallery={five} />);
    const section = document.getElementById("about")!;
    expect(
      within(section).getAllByText("ТЕКСТ-ПРО-МЕНЯ-42").length,
    ).toBeGreaterThan(0);
  });
});
