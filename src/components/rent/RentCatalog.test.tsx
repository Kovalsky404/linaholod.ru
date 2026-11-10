import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RentalItemView } from "@/sanity/types";
import { RentCatalog } from "./RentCatalog";

/**
 * Каталог аренды. Обещания:
 * - «Забронировать» открывает рабочий Telegram с названием вещи (и ссылкой
 *   на пост) — менеджеру не нужно переспрашивать;
 * - «Instagram» ведёт на пост ЭТОЙ вещи, а без ссылки — в профиль проката;
 * - пустой каталог не выглядит сломанным: зовёт в Instagram;
 * - фильтр появляется только при двух и более категориях.
 */

const item = (over: Partial<RentalItemView> = {}): RentalItemView => ({
  id: "i1",
  title: "Шёлковое платье",
  image: { src: "/x.jpg", unoptimized: true },
  instagramUrl: "https://www.instagram.com/p/AAA/",
  ...over,
});

const PROFILE = "https://www.instagram.com/holod.rent/";

describe("RentCatalog", () => {
  it("1. «Забронировать» — Telegram с названием вещи и ссылкой на пост", () => {
    render(<RentCatalog items={[item()]} />);
    const book = screen.getByRole("link", {
      name: "Забронировать: Шёлковое платье",
    });
    const url = new URL(book.getAttribute("href")!);
    expect(url.origin + url.pathname).toBe("https://t.me/holod_styling");
    const text = url.searchParams.get("text")!;
    expect(text).toContain("«Шёлковое платье»");
    expect(text).toContain("https://www.instagram.com/p/AAA/");
    expect(book).toHaveAttribute("target", "_blank");
  });

  it("2. «Instagram» ведёт на пост вещи; без ссылки — в профиль проката", () => {
    render(
      <RentCatalog
        items={[
          item(),
          item({ id: "i2", title: "Жакет", instagramUrl: undefined }),
        ]}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Шёлковое платье — пост в Instagram" }),
    ).toHaveAttribute("href", "https://www.instagram.com/p/AAA/");
    expect(
      screen.getByRole("link", { name: "Жакет — пост в Instagram" }),
    ).toHaveAttribute("href", PROFILE);
    // Без поста в сообщении нет «висячей» ссылки.
    const text = new URL(
      screen
        .getByRole("link", { name: "Забронировать: Жакет" })
        .getAttribute("href")!,
    ).searchParams.get("text")!;
    expect(text).not.toContain("instagram.com");
  });

  it("3. «Instagram» стоит ПОД «Забронировать» в каждой карточке", () => {
    render(<RentCatalog items={[item()]} />);
    const card = screen.getByRole("article");
    const links = within(card)
      .getAllByRole("link")
      .map((a) => a.getAttribute("aria-label"));
    expect(links).toEqual([
      "Забронировать: Шёлковое платье",
      "Шёлковое платье — пост в Instagram",
    ]);
  });

  it("4. цена крупно отдельно от «/ сутки», размер — чипом, примечание — строкой", () => {
    render(
      <RentCatalog
        items={[
          item({
            size: "M/L",
            price: "1 600 ₽ / сутки, по отдельности — 800 ₽",
          }),
        ]}
      />,
    );
    const card = within(screen.getByRole("article"));
    expect(card.getByText("1 600 ₽")).toBeInTheDocument();
    expect(card.getByText("/ сутки")).toBeInTheDocument();
    expect(card.getByText("Размер M/L")).toBeInTheDocument();
    expect(card.getByText("по отдельности — 800 ₽")).toBeInTheDocument();
  });

  it("5. пустой каталог зовёт в Instagram проката, карточек нет", () => {
    render(<RentCatalog items={[]} />);
    expect(screen.getByText("Каталог обновляется")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /@holod\.rent/ })).toHaveAttribute(
      "href",
      PROFILE,
    );
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("6. одна категория — фильтра нет (одна кнопка над сеткой — шум)", () => {
    render(
      <RentCatalog
        items={[
          item({ category: "Платья" }),
          item({ id: "2", category: "Платья" }),
        ]}
      />,
    );
    expect(
      screen.queryByRole("group", { name: "Фильтр по категориям" }),
    ).not.toBeInTheDocument();
  });

  it("7. фильтр: порядок кнопок из списка категорий, клик сужает сетку", async () => {
    const user = userEvent.setup();
    render(
      <RentCatalog
        items={[
          item({ id: "a", title: "Ботильоны", category: "Обувь" }),
          item({ id: "b", title: "Платье", category: "Платья" }),
          item({ id: "c", title: "Туфли", category: "Обувь" }),
        ]}
      />,
    );
    const group = screen.getByRole("group", { name: "Фильтр по категориям" });
    const chips = within(group).getAllByRole("button");
    // Имя кнопки — категория; число вещей рядом видно глазу, но в имя не
    // входит (aria-hidden), чтобы скринридер не читал «Обувь два».
    expect(chips.map((b) => b.textContent)).toEqual([
      "Все3",
      "Платья1",
      "Обувь2",
    ]);
    expect(
      within(group).getByRole("button", { name: "Обувь" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("rent-count")).toHaveTextContent("3 вещи");

    await user.click(within(group).getByRole("button", { name: "Обувь" }));
    expect(
      within(group).getByRole("button", { name: "Обувь" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.queryByText("Платье")).not.toBeInTheDocument();
    // Живая область сообщает скринридеру, сколько осталось.
    expect(screen.getByTestId("rent-count")).toHaveTextContent("2 вещи");
    expect(screen.getByTestId("rent-count")).toHaveAttribute(
      "aria-live",
      "polite",
    );

    await user.click(within(group).getByRole("button", { name: "Все" }));
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("8. кадр открывает быстрый просмотр: фото крупно, цена, размер и бронь", async () => {
    const user = userEvent.setup();
    render(
      <RentCatalog
        items={[
          item({ category: "Платья", size: "S", price: "2 000 ₽ / сутки" }),
          item({ id: "i2", title: "Жакет" }),
        ]}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Подробнее: Шёлковое платье" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Шёлковое платье" });
    const d = within(dialog);
    expect(d.getByRole("img", { name: "Шёлковое платье" })).toBeInTheDocument();
    expect(d.getByText("2 000 ₽")).toBeInTheDocument();
    expect(d.getByText("Размер S")).toBeInTheDocument();
    // Ключевые условия — прямо в карточке вещи.
    expect(d.getByText("предоплата закрепляет бронь")).toBeInTheDocument();

    // Бронь ведёт туда же, куда кнопка на карточке: та же вещь, тот же текст.
    const book = d.getByRole("link", { name: "Забронировать в Telegram" });
    const cardBook = screen.getByRole("link", {
      name: "Забронировать: Шёлковое платье",
    });
    expect(book.getAttribute("href")).toBe(cardBook.getAttribute("href"));
    expect(
      d.getByRole("link", {
        name: "Шёлковое платье — открыть пост в Instagram",
      }),
    ).toHaveAttribute("href", "https://www.instagram.com/p/AAA/");
  });

  it("9. быстрый просмотр закрывается и открывает другую вещь", async () => {
    const user = userEvent.setup();
    render(
      <RentCatalog items={[item(), item({ id: "i2", title: "Жакет" })]} />,
    );
    await user.click(screen.getByRole("button", { name: "Подробнее: Жакет" }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Жакет");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Подробнее: Шёлковое платье" }),
    );
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Шёлковое платье");
  });
});
