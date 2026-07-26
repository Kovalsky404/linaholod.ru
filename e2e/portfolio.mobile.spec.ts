import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * Быстрый просмотр портфолио — проверки в НАСТОЯЩЕМ браузере.
 * jsdom не считает раскладку и не применяет CSS, поэтому схлопнувшийся
 * контейнер, кроссфейд по прозрачности и приоритеты загрузки проверяются
 * только здесь.
 *
 * Про декодирование видео: файл в CMS может быть в контейнере, который браузер
 * не проигрывает. Тогда элемент рисуется плейсхолдером 300×150. Поэтому
 * геометрию проверяем по контейнеру и вложенности, а не по размеру <video>.
 */

/** Карточка видео-работы: подпись формируется как «… (видео)» / «(видео и N фото)». */
const videoCard = (page: Page) =>
  page.getByRole("button", { name: /^Открыть работу:.*\(видео/ });

/**
 * Первая ФОТО-работа, у которой не меньше `min` кадров, и само число кадров.
 * Разбираем число из подписи, а не матчим диапазон регуляркой: шаблон вида
 * `[2-9]\d*` не покрывает «10 фото»…«19 фото» и при этом принимает работу
 * ровно с 2 кадрами, где окно предзагрузки монтирует не три слайда, а два.
 * Работы с видео пропускаем: у них активный слайд — <video>, и проверки,
 * написанные про <img> (их количество, прозрачность, приоритет), считали бы
 * не то. Видео покрыто отдельным тестом выше.
 */
async function workWithAtLeast(
  page: Page,
  min: number,
): Promise<{ card: Locator; photos: number } | null> {
  const cards = page.getByRole("button", { name: /^Открыть работу:/ });
  // evaluateAll не ждёт появления узлов. Без явного ожидания непрорисованное
  // портфолио выглядело бы как «работ нет» и превращало проверки в тихий пропуск.
  await expect(cards.first()).toBeVisible();
  const labels = await cards.evaluateAll((els) =>
    els.map((el) => el.getAttribute("aria-label") ?? ""),
  );
  for (let i = 0; i < labels.length; i++) {
    if (labels[i]!.includes("видео")) continue;
    const n = Number(labels[i]!.match(/(\d+) фото/)?.[1] ?? 0);
    if (n >= min) return { card: cards.nth(i), photos: n };
  }
  return null;
}

async function openDialog(card: Locator, page: Page): Promise<Locator> {
  await card.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test("видео-работа: видео вписано в модалку и не перекрывает текст", async ({
  page,
}) => {
  await page.goto("/");

  // Условие выводим из ОТДАННОЙ страницы, а не из переменных окружения:
  // окружение раннера ничего не говорит о том, что отрендерил сервер (Sanity
  // мог быть недоступен, могла отдаться статика, мог быть переиспользован
  // чужой dev-сервер). Нет видео-работы в контенте — проверять нечего.
  // Сначала дожидаемся отрисовки карточек — count() не ждёт, и сбой рендера
  // иначе замаскировался бы под «в контенте нет видео».
  await expect(
    page.getByRole("button", { name: /^Открыть работу:/ }).first(),
  ).toBeVisible();
  const card = videoCard(page);
  const hasVideoWork = (await card.count()) > 0;
  test.skip(
    !hasVideoWork,
    "В отданном контенте нет работы с видео — проверять нечего",
  );

  const d = await openDialog(card.first(), page);
  const video = d.locator("video");
  await expect(video).toBeVisible();

  const mediaBox = d.locator('[data-slide="video"]');
  await expect(mediaBox).toHaveAttribute("data-active", "true");

  const tolerance = 2; // сглаживаем субпиксельные округления
  const dBox = (await d.boundingBox())!;
  const vBox = (await video.boundingBox())!;
  const mBox = (await mediaBox.boundingBox())!;

  // 1. Ни модалка, ни контейнер не схлопнулись. Порог по контейнеру намеренно
  //    относительный: контейнер обязан ОБНИМАТЬ видео (то есть быть в потоке и
  //    получать от него высоту). Абсолютный порог был бы ложно зелёным на
  //    плейсхолдере недекодируемого файла.
  expect(dBox.height).toBeGreaterThan(200);
  expect(mBox.height).toBeGreaterThanOrEqual(vBox.height - tolerance);
  expect(mBox.height).toBeGreaterThan(0);

  // 2. Видео целиком внутри модалки, а не поверх/за её границами.
  expect(vBox.x).toBeGreaterThanOrEqual(dBox.x - tolerance);
  expect(vBox.y).toBeGreaterThanOrEqual(dBox.y - tolerance);
  expect(vBox.x + vBox.width).toBeLessThanOrEqual(
    dBox.x + dBox.width + tolerance,
  );
  expect(vBox.y + vBox.height).toBeLessThanOrEqual(
    dBox.y + dBox.height + tolerance,
  );

  // 3. Видео не наезжает на описание. Проверка БЕЗУСЛОВНАЯ.
  const meta = d.getByText("Дата", { exact: true });
  await expect(meta).toBeVisible();
  const tBox = (await meta.boundingBox())!;
  expect(tBox.y).toBeGreaterThan(vBox.y + vBox.height - tolerance);

  // 4. Активный плеер достижим с клавиатуры: <video controls> забирает остановку
  //    Tab и не должен быть заперт внутри модалки недостижимым. В jsdom это не
  //    проверить — user-event не считает video фокусируемым.
  await d.getByRole("button", { name: "Закрыть" }).focus();
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(focused).toBe("VIDEO");
});

test("кроссфейд: активный кадр непрозрачен, соседи прозрачны", async ({
  page,
}) => {
  await page.goto("/");

  // Нужна работа минимум с двумя кадрами, иначе соседей нет. Это НЕ skip:
  // даже статический фолбэк (src/lib/portfolio.ts) содержит работы на 8–12
  // кадров, поэтому «не нашлось» означает поломку — либо подписи карточек,
  // либо рендера портфолио. Тихий пропуск здесь снял бы единственное
  // браузерное покрытие кроссфейда и приоритетов.
  const found = await workWithAtLeast(page, 2);
  expect(
    found,
    "Не нашлось фото-работы с ≥2 кадрами — сломаны подписи карточек или рендер портфолио",
  ).not.toBeNull();

  const d = await openDialog(found!.card, page);
  const imgs = d.locator("img");
  // Окно предзагрузки: текущий + два соседа, но не больше числа кадров.
  await expect(imgs).toHaveCount(Math.min(3, found!.photos));

  const opacities = async () =>
    await imgs.evaluateAll((els) =>
      els.map((el) => ({
        opacity: getComputedStyle(el).opacity,
        hidden: el.getAttribute("aria-hidden"),
        src: el.getAttribute("src"),
      })),
    );

  // Ждём завершения перехода (300мс) и снимаем ВЫЧИСЛЕННУЮ прозрачность:
  // именно её jsdom не считает, из-за чего инверсия классов там незаметна.
  await page.waitForTimeout(400);
  const before = await opacities();
  const visibleBefore = before.filter((o) => o.opacity === "1");
  expect(visibleBefore).toHaveLength(1); // видно ровно один кадр
  expect(visibleBefore[0]!.hidden).not.toBe("true"); // и это НЕ скрытый сосед
  expect(before.filter((o) => o.opacity === "0")).toHaveLength(
    Math.min(3, found!.photos) - 1,
  );

  // После перехода видимым становится ДРУГОЙ кадр — снова ровно один. Сверяем
  // именно src: без этого проверка повторяла бы инвариант «видно ровно один» и
  // проходила бы даже если ArrowRight вообще ничего не делает.
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(400);
  const after = await opacities();
  const visibleAfter = after.filter((o) => o.opacity === "1");
  expect(visibleAfter).toHaveLength(1);
  expect(visibleAfter[0]!.hidden).not.toBe("true");
  expect(visibleAfter[0]!.src).not.toBe(visibleBefore[0]!.src);
});

test("приоритет загрузки: активный кадр важнее соседей", async ({ page }) => {
  await page.goto("/");
  const found = await workWithAtLeast(page, 2);
  expect(
    found,
    "Не нашлось фото-работы с ≥2 кадрами — сломаны подписи карточек или рендер портфолио",
  ).not.toBeNull();

  const d = await openDialog(found!.card, page);
  // evaluateAll — одномоментный снимок без авто-ожидания: если соседи ещё не
  // примонтированы, active === 1 пройдёт, а цикл по neighbours не выполнится
  // ни разу и проверка станет пустой. Сначала дожидаемся всего окна.
  const expected = Math.min(3, found!.photos);
  await expect(d.locator("img")).toHaveCount(expected);
  const attrs = await d.locator("img").evaluateAll((els) =>
    els.map((el) => ({
      fetchPriority: el.getAttribute("fetchpriority"),
      hidden: el.getAttribute("aria-hidden"),
    })),
  );

  const active = attrs.filter((a) => a.hidden !== "true");
  const neighbours = attrs.filter((a) => a.hidden === "true");
  expect(active).toHaveLength(1);
  expect(neighbours).toHaveLength(expected - 1); // соседи реально проверены
  // Видимый кадр не должен делить канал с невидимыми на равных.
  expect(active[0]!.fetchPriority).toBe("high");
  for (const n of neighbours) expect(n.fetchPriority).toBe("low");
});

// Ветки preload (auto у активного / none у соседнего) проверяются юнит-тестом
// 16e на синтетической работе «видео + фото». E2E-версия здесь была бы вечно
// пропущенной: в CMS такой работы нет, а тест, который никогда не выполняется,
// создаёт ложное ощущение покрытия.
