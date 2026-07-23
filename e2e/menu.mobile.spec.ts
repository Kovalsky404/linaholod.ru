import { test, expect } from "@playwright/test";

/**
 * F10 (mobile) — бургер-меню на телефонном вьюпорте (проект mobile-chrome).
 * Бургер открывает меню, клик по пункту навигирует к секции И закрывает меню.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("8. бургер открывает меню; клик по пункту навигирует и закрывает", async ({
  page,
}) => {
  const burger = page.getByRole("button", { name: /меню/ });
  await expect(burger).toBeVisible();
  await expect(burger).toHaveAttribute("aria-expanded", "false");

  await burger.click();
  await expect(burger).toHaveAttribute("aria-expanded", "true");

  await page
    .getByRole("navigation", { name: "Мобильная навигация" })
    .getByRole("link", { name: "Портфолио" })
    .click();

  await expect(page.locator("#portfolio")).toBeInViewport({ ratio: 0.2 });
  await expect(burger).toHaveAttribute("aria-expanded", "false"); // меню закрылось
});
