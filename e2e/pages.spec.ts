import { test, expect } from "@playwright/test";

/**
 * Новые страницы и приветственное окно — в настоящем браузере.
 * Ключаемся на роли и адреса, не на контент из Sanity (каталог аренды может
 * быть и пустым, и заполненным — обе ветки валидны).
 */

test.describe("приветственное окно −10%", () => {
  // Свежий посетитель: сбрасываем отметку, которую конфиг ставит всем спекам.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("1. появляется у нового посетителя и больше не возвращается", async ({
    page,
  }) => {
    await page.goto("/");
    const dialog = page.getByRole("dialog", {
      name: "Скидка 10% на первый заказ",
    });
    await expect(dialog).toBeVisible({ timeout: 8_000 });

    const cta = dialog.getByRole("link", { name: /Получить скидку/ });
    await expect(cta).toHaveAttribute(
      "href",
      /^https:\/\/t\.me\/holod_styling\?text=/,
    );

    await dialog.getByRole("button", { name: "Не сейчас" }).click();
    await expect(dialog).toBeHidden();

    // Перезагрузка и переход на другую страницу — окна больше нет.
    await page.reload();
    await page.waitForTimeout(4_500);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("страница сертификата", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/certificates");
  });

  test("2. выбор дизайна и суммы → «Купить» → Telegram с этими данными", async ({
    page,
  }) => {
    // force: сами radio визуально скрыты (sr-only), кликают по их подписям.
    await page.getByRole("radio", { name: "Лес" }).check({ force: true });
    await page
      .getByRole("radio", { name: /^25\s000\s₽$/ })
      .check({ force: true });
    await page.getByRole("button", { name: "Купить сертификат" }).click();

    const tg = page.getByRole("link", { name: /В Telegram/ });
    await expect(tg).toBeVisible();
    const text = new URL((await tg.getAttribute("href"))!).searchParams.get(
      "text",
    )!;
    expect(text).toMatch(/25\s000 ₽/);
    expect(text).toContain("«Лес»");
  });

  test("3. условия использования открываются панелью и закрываются", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Условия использования" }).click();
    const dialog = page.getByRole("dialog", { name: "Условия использования" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      "Срок действия сертификата — 6 месяцев.",
    );
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

test.describe("страница аренды", () => {
  test("4. каталог или приглашение в Instagram — страница не пустая", async ({
    page,
  }) => {
    await page.goto("/rent");
    const catalog = page.locator("#catalog");
    const cards = catalog.getByRole("article");
    // Либо карточки с бронью, либо пустое состояние со ссылкой на профиль.
    if ((await cards.count()) > 0) {
      await expect(
        cards.first().getByRole("link", { name: /^Забронировать:/ }),
      ).toHaveAttribute("href", /^https:\/\/t\.me\/holod_styling\?text=/);
      await expect(
        cards.first().getByRole("link", { name: /пост в Instagram$/ }),
      ).toHaveAttribute("href", /instagram\.com/);

      // Быстрый просмотр: кадр открывает панель с той же бронью.
      const book = await cards
        .first()
        .getByRole("link", { name: /^Забронировать:/ })
        .getAttribute("href");
      await cards
        .first()
        .getByRole("button", { name: /^Подробнее:/ })
        .click();
      const quick = page.getByRole("dialog");
      await expect(quick).toBeVisible();
      await expect(
        quick.getByRole("link", { name: "Забронировать в Telegram" }),
      ).toHaveAttribute("href", book!);
      await page.keyboard.press("Escape");
      await expect(quick).toBeHidden();
    } else {
      await expect(catalog.getByText("Каталог обновляется")).toBeVisible();
      await expect(
        catalog.getByRole("link", { name: /@holod\.rent/ }),
      ).toHaveAttribute("href", "https://www.instagram.com/holod.rent/");
    }
  });

  test("4b. «Правила аренды» открывают панель с правилами", async ({
    page,
  }) => {
    await page.goto("/rent");
    await page.getByRole("button", { name: "Правила аренды" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Правила аренды" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("24 часа");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("5. «Обо мне» с подстраницы ведёт на главную к секции", async ({
    page,
  }) => {
    await page.goto("/rent");
    await page
      .getByRole("navigation", { name: "Основная навигация" })
      .getByRole("link", { name: "Обо мне" })
      .click();
    await expect(page).toHaveURL(/\/#about$/);
    await expect(page.locator("#about")).toBeInViewport({ ratio: 0.2 });
  });
});
