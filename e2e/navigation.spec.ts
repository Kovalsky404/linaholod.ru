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

test("6. CTA «Записаться» в шапке — внешняя ссылка в Telegram", async ({
  page,
}) => {
  const cta = page.locator("header").getByRole("link", { name: "Записаться" });
  await expect(cta).toHaveAttribute("href", "https://t.me/holod_styling");
  await expect(cta).toHaveAttribute("target", "_blank");
});

test("8. секция «Записаться» ведёт в Telegram и НЕ содержит формы", async ({
  page,
}) => {
  const section = page.locator("#book");
  await expect(
    section.getByRole("link", { name: /Записаться в Telegram/i }),
  ).toHaveAttribute("href", "https://t.me/holod_styling");
  // ПД не собираем: полей ввода/чекбоксов в секции нет
  await expect(section.getByRole("textbox")).toHaveCount(0);
  await expect(section.getByRole("checkbox")).toHaveCount(0);
});

test("7. быстрый просмотр портфолио: открытие → навигация → закрытие", async ({
  page,
}) => {
  // Берём первую работу, у которой БОЛЬШЕ одного слайда, а число слайдов
  // выводим из подписи карточки: «N фото» / «видео и N фото» (видео — тоже
  // слайд). Так проверка детерминирована и не зависит от порядка работ в CMS:
  // раньше она молча пропускалась, если счётчик не отрисовался, и сломанное
  // листание прошло бы с зелёным прогоном.
  const cards = page.getByRole("button", { name: /^Открыть работу:/ });
  await expect(cards.first()).toBeVisible();

  let card = null;
  let slides = 0;
  for (const c of await cards.all()) {
    const label = (await c.getAttribute("aria-label")) ?? "";
    const n =
      Number(label.match(/(\d+) фото/)?.[1] ?? 0) +
      (label.includes("видео") ? 1 : 0);
    if (n > 1) {
      card = c;
      slides = n;
      break;
    }
  }
  // Не skip: работа с несколькими кадрами в портфолио есть всегда, и её
  // исчезновение само по себе — регресс контента, о котором надо узнать.
  expect(card, "нет ни одной работы с несколькими слайдами").not.toBeNull();

  await card!.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName(/— портфолио$/);

  // Счётчик обязан быть, и стрелка обязана листать. Сравниваем строкой, а не
  // new RegExp(`\s`): в шаблонной строке \s схлопывается в 's', и такой
  // «регексп» тихо перестал бы совпадать с «1 / 11».
  const counter = dialog.getByText(/^\d+\s*\/\s*\d+$/);
  await expect(counter).toHaveText(`1 / ${slides}`);
  await page.keyboard.press("ArrowRight");
  await expect(counter).toHaveText(`2 / ${slides}`);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("9. «Прокат» в шапке ведёт в Instagram проката, в новой вкладке", async ({
  page,
}) => {
  const rent = page.locator("header").getByRole("link", { name: "Прокат" });
  await expect(rent).toHaveAttribute(
    "href",
    "https://www.instagram.com/holod.rent/",
  );
  await expect(rent).toHaveAttribute("target", "_blank");
});

test("10. «Сертификаты» открывают диалог с покупкой в Telegram", async ({
  page,
}) => {
  await page
    .locator("header")
    .getByRole("button", { name: "Сертификаты" })
    .click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName(/Подарочный сертификат/);
  await expect(dialog.getByRole("link", { name: /Telegram/i })).toHaveAttribute(
    "href",
    "https://t.me/holod_styling",
  );

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("11. семь пунктов шапки не наезжают на логотип", async ({ page }) => {
  // Регресс-лок на раскладку: пунктов стало семь, и на 1024px правая группа
  // упиралась в логотип вплотную. Поэтому горизонтальное меню включается
  // с 1280 — ниже работает бургер. Проверяем обе стороны границы.
  await page.setViewportSize({ width: 1024, height: 800 });
  await expect(
    page.locator("header").getByRole("button", { name: /меню/i }),
  ).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  const header = page.locator("header");
  const box = await header
    .getByRole("navigation", { name: "Основная навигация" })
    .boundingBox();
  const logo = await header
    .getByRole("link", { name: /на главную/ })
    .boundingBox();
  const certs = await header
    .getByRole("button", { name: "Сертификаты" })
    .boundingBox();

  // Зазор с обеих сторон логотипа — иначе строка выглядит слипшейся.
  expect(logo!.x - (box!.x + box!.width)).toBeGreaterThan(8);
  expect(certs!.x - (logo!.x + logo!.width)).toBeGreaterThan(8);
});
