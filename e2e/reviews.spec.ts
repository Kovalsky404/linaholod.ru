import { test, expect, type Locator } from "@playwright/test";

/**
 * F15 — ленты отзывов: едут сами и прокручиваются руками.
 *
 * Проверять это можно только в настоящем браузере: в jsdom нет раскладки,
 * scrollWidth равен нулю, и цикл прокрутки просто не запускается. Юнит-тесты
 * закрывают разметку и доступность, поведение — здесь.
 */

const ROW = /Отзывы клиентов/;

/** scrollLeft ленты. */
const pos = (row: Locator) => row.evaluate((el) => el.scrollLeft);

/** Ждём, пока лента станет прокручиваемой (карточки отрисованы и померены). */
async function readyRow(row: Locator) {
  await expect(row).toBeVisible();
  await expect
    .poll(() => row.evaluate((el) => el.scrollWidth - el.clientWidth), {
      timeout: 7000,
    })
    .toBeGreaterThan(100);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.locator("#reviews").scrollIntoViewIfNeeded();
});

test("R1. лента едет сама", async ({ page }) => {
  const row = page.getByRole("group", { name: ROW }).first();
  await readyRow(row);

  const before = await pos(row);
  // Не toBeGreaterThan: верхняя лента едет к нулю, нижняя — от него.
  // Проверяем ФАКТ движения, иначе тест зависел бы от направления ленты.
  await expect
    .poll(async () => Math.abs((await pos(row)) - before), { timeout: 5000 })
    .toBeGreaterThan(5);
});

test("R2. ленту можно прокрутить самому, и она остаётся там, куда её увели", async ({
  page,
}) => {
  const row = page.getByRole("group", { name: ROW }).nth(1);
  await readyRow(row);

  const before = await pos(row);
  await row.hover();
  await page.mouse.wheel(300, 0);

  // Сдвиг от колеса заметно больше дрейфа за то же время: дрейф — это
  // ширина копии за 55–65 с, то есть единицы пикселей за долю секунды.
  await expect
    .poll(async () => (await pos(row)) - before, { timeout: 3000 })
    .toBeGreaterThan(100);
});

test("R3. дрейф уступает пользователю: сразу после прокрутки лента стоит", async ({
  page,
}) => {
  const row = page.getByRole("group", { name: ROW }).nth(1);
  await readyRow(row);

  await row.hover();
  await page.mouse.wheel(200, 0);
  await page.waitForTimeout(300); // даём инерции колеса улечься

  const settled = await pos(row);
  await page.waitForTimeout(700); // всё ещё внутри паузы IDLE_MS
  const later = await pos(row);

  // Без паузы лента продолжала бы уезжать из-под пальца прямо во время
  // прокрутки — ради этого дрейф и приостанавливается.
  expect(Math.abs(later - settled)).toBeLessThan(5);
});

test("R4. дрейф возобновляется, когда пользователь отпустил", async ({
  page,
}) => {
  const row = page.getByRole("group", { name: ROW }).nth(1);
  await readyRow(row);

  await row.hover();
  await page.mouse.wheel(200, 0);
  await page.waitForTimeout(1800); // пауза (1500 мс) уже истекла

  const before = await pos(row);
  await expect
    .poll(async () => Math.abs((await pos(row)) - before), { timeout: 5000 })
    .toBeGreaterThan(5);
});

test("R6. при «меньше движения» дрейфа нет, но прокрутить руками можно", async ({
  page,
}) => {
  // Через emulateMedia, а не test.use({ reducedMotion }): вложенный в describe
  // test.use до контекста не доходил, и лента продолжала ехать. Значение
  // читается компонентом каждый кадр, поэтому перезагрузка не нужна.
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    "эмуляция не применилась — проверка ниже была бы бессмысленной",
  ).toBe(true);

  const row = page.getByRole("group", { name: ROW }).nth(1);
  await readyRow(row);

  // Само не едет — этого и просит системная настройка.
  const before = await pos(row);
  await page.waitForTimeout(1200);
  expect(Math.abs((await pos(row)) - before)).toBeLessThan(5);

  // Но управление остаётся: отзывы за краем не должны становиться
  // недоступными только потому, что человек отключил анимации.
  await row.hover();
  await page.mouse.wheel(300, 0);
  await expect
    .poll(async () => (await pos(row)) - before, { timeout: 3000 })
    .toBeGreaterThan(100);
});

test("R7. прокрутка ленты мгновенная, а не анимированная", async ({ page }) => {
  // Инвариант, а не проверка конкретного класса. scroll-behavior не
  // наследуется, поэтому smooth у html (он там ради якорной навигации) до
  // ленты сегодня не доходит — и удаление scroll-auto этот тест не уронит,
  // проверено мутацией. Смысл в другом: если правило когда-нибудь расширят
  // до глобального (* или body), перескок на стыке станет анимированным и
  // превратится в видимый пролёт по всем карточкам. Поведенчески такое
  // ловится только съёмкой кадров, поэтому фиксируем вычисленный стиль.
  const row = page.getByRole("group", { name: ROW }).first();
  await expect(row).toBeVisible();

  const behavior = await row.evaluate(
    (el) => getComputedStyle(el).scrollBehavior,
  );
  expect(behavior).toBe("auto");
});

test("R8. на широком мониторе лента тоже едет", async ({ page }) => {
  // Регресс-лок на реальный баг: при фиксированных двух копиях одна копия
  // (≈1320px) оказывалась уже экрана начиная с 1440px, петля становилась
  // недостижимой и дрейф выключался совсем. На телефоне копия шире экрана,
  // поэтому там всё работало — и на десктопе баг заметил уже клиент.
  // Дефолтный вьюпорт Playwright (1280) проходил условие впритык и ничего
  // не ловил, поэтому здесь берём заведомо широкий.
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.reload();
  await page.locator("#reviews").scrollIntoViewIfNeeded();

  const row = page.getByRole("group", { name: ROW }).nth(1);
  await readyRow(row);

  // Запас прокрутки должен покрывать период петли, иначе перескакивать некуда.
  const room = await row.evaluate((el) => {
    const track = el.firstElementChild as HTMLElement;
    const period = el.scrollWidth / track.children.length;
    return el.scrollWidth - el.clientWidth - period;
  });
  expect(room).toBeGreaterThan(0);

  const before = await pos(row);
  await expect
    .poll(async () => Math.abs((await pos(row)) - before), { timeout: 5000 })
    .toBeGreaterThan(5);
});

test("R5. ленты не тянут вбок саму страницу", async ({ page }) => {
  const row = page.getByRole("group", { name: ROW }).first();
  await readyRow(row);
  await row.hover();
  await page.mouse.wheel(600, 0);
  await page.waitForTimeout(300);

  // Регресс-лок: полосы full-bleed, и потеря overflow у ленты сразу даёт
  // горизонтальную прокрутку всей страницы.
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1); // допуск на дробный пиксель
});
