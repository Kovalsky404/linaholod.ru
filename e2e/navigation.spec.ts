import { test, expect } from "@playwright/test";

/**
 * F10 — навигация по якорям, CTA к форме, быстрый просмотр портфолио.
 * Ключаемся на роли/якоря/структуру, не на контент из Sanity.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("4. десктоп-навигация (левая группа) прокручивает к секции", async ({
  page,
}) => {
  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("link", { name: "Портфолио" })
    .click();
  await expect(page.locator("#portfolio")).toBeInViewport({ ratio: 0.2 });
});

test("5. десктоп-навигация (правая группа): Отзывы и Контакты", async ({
  page,
}) => {
  const rightNav = page.getByRole("navigation", {
    name: "Дополнительная навигация",
  });
  await rightNav.getByRole("link", { name: "Отзывы" }).click();
  await expect(page.locator("#reviews")).toBeInViewport({ ratio: 0.2 });
  await rightNav.getByRole("link", { name: "Контакты" }).click();
  await expect(page.locator("#contacts")).toBeInViewport({ ratio: 0.2 });
});

test("6. CTA «Записаться» в шапке ведёт к форме", async ({ page }) => {
  await page
    .locator("header")
    .getByRole("link", { name: "Записаться" })
    .click();
  await expect(page.locator("#book")).toBeInViewport({ ratio: 0.2 });
  await expect(
    page.getByRole("button", { name: "Отправить заявку" }),
  ).toBeVisible();
});

test("7. быстрый просмотр портфолио: открытие → навигация → закрытие", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: /^Открыть работу:/ })
    .first()
    .click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName(/— портфолио$/);

  // Навигация слайдов — только если их больше одного (данные могут разниться).
  const counter = dialog.getByText(/^\d+\s*\/\s*\d+$/);
  const total = Number((await counter.textContent())!.split("/")[1]!.trim());
  if (total > 1) {
    await page.keyboard.press("ArrowRight");
    await expect(dialog.getByText(new RegExp(`^2\\s*/\\s*${total}$`))).toBeVisible();
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
