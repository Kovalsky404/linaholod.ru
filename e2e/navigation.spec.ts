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
