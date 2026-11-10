import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RentRules } from "./RentRules";

/** «Правила аренды» — боковая панель с полным списком, как у сертификата. */
describe("RentRules", () => {
  const terms = ["Срок — 24 часа.", "Предоплата 50%."];

  it("1. открывает панель со всеми пунктами по порядку и закрывается", async () => {
    const user = userEvent.setup();
    render(<RentRules terms={terms} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Правила аренды" }));
    const dialog = screen.getByRole("dialog", { name: "Правила аренды" });
    const items = within(dialog).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "01Срок — 24 часа.",
      "02Предоплата 50%.",
    ]);

    await user.click(
      within(dialog).getAllByRole("button", { name: "Закрыть" })[0]!,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("2. вариант pill — та же панель", async () => {
    const user = userEvent.setup();
    render(<RentRules terms={terms} variant="pill" />);
    await user.click(screen.getByRole("button", { name: "Правила аренды" }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Правила аренды");
  });
});
