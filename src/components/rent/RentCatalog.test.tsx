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

  it("4. размер и цена показываются, когда заданы", () => {
    render(
      <RentCatalog items={[item({ size: "S–M", price: "2 500 ₽ / сутки" })]} />,
    );
    expect(
      screen.getByText("Размер S–M · 2 500 ₽ / сутки"),
    ).toBeInTheDocument();
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
    expect(
      within(group)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Все", "Платья", "Обувь"]);
    expect(screen.getByText("3 вещи")).toBeInTheDocument();

    await user.click(within(group).getByRole("button", { name: "Обувь" }));
    expect(
      within(group).getByRole("button", { name: "Обувь" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.queryByText("Платье")).not.toBeInTheDocument();
    expect(screen.getByText("2 вещи")).toBeInTheDocument();

    await user.click(within(group).getByRole("button", { name: "Все" }));
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });
});
