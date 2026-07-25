import { test, expect, type Locator } from "@playwright/test";

/**
 * Мобильная раскладка быстрого просмотра — проверка РЕАЛЬНЫХ размеров.
 * jsdom-тесты не видят layout, поэтому схлопнувшийся контейнер и вылезшее
 * поверх текста видео ловятся только здесь, в настоящем браузере.
 */

/** Открывает работы по очереди, пока не найдётся та, где есть <video>. */
async function openVideoWork(page: import("@playwright/test").Page) {
  const cards = page.getByRole("button", { name: /^Открыть работу:/ });
  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    await cards.nth(i).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    if ((await dialog.locator("video").count()) > 0) return dialog;
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  }
  return null;
}

test("видео-работа: видео вписано в модалку и не перекрывает текст", async ({
  page,
}) => {
  await page.goto("/");
  const dialog = await openVideoWork(page);
  test.skip(dialog === null, "В портфолио нет работы с видео");

  const d = dialog as Locator;
  const video = d.locator("video");
  await expect(video).toBeVisible();

  const dBox = (await d.boundingBox())!;
  const vBox = (await video.boundingBox())!;

  // 1. Модалка не схлопнулась.
  expect(dBox.height).toBeGreaterThan(200);

  // 2. Видео реально видно (а не нулевой высоты).
  expect(vBox.height).toBeGreaterThan(100);

  // 3. Ключевое: видео целиком внутри модалки, а не поверх/за её границами.
  const tolerance = 2; // сглаживаем субпиксельные округления
  expect(vBox.x).toBeGreaterThanOrEqual(dBox.x - tolerance);
  expect(vBox.y).toBeGreaterThanOrEqual(dBox.y - tolerance);
  expect(vBox.x + vBox.width).toBeLessThanOrEqual(
    dBox.x + dBox.width + tolerance,
  );
  expect(vBox.y + vBox.height).toBeLessThanOrEqual(
    dBox.y + dBox.height + tolerance,
  );

  // 4. Видео не наезжает на описание: текст начинается ниже видео.
  const desc = d.getByText(/ДАТА|Дата/i).first();
  if (await desc.isVisible()) {
    const tBox = (await desc.boundingBox())!;
    expect(tBox.y).toBeGreaterThan(vBox.y + vBox.height - tolerance);
  }
});
