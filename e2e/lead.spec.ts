import { test, expect, type Page, type Request } from "@playwright/test";

/**
 * F9 — E2E happy-path заявки. Перехватываем /api/lead в браузере (page.route),
 * поэтому реальный Telegram НИКОГДА не задействуется. Реальный обработчик
 * маршрута покрыт vitest-интеграцией; здесь проверяем петлю браузер → запрос → UI.
 */

test.beforeEach(async ({ page }) => {
  // Safety-дефолт: любой submit перехвачен, наружу ничего не уходит.
  await page.route("**/api/lead", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    }),
  );
  await page.goto("/");
});

async function fillForm(
  page: Page,
  { name = "Тест", contact = "@tester", message = "" } = {},
) {
  await page.getByLabel(/Имя/).fill(name);
  await page.getByLabel(/Телефон или Telegram/).fill(contact);
  if (message) await page.getByLabel("Сообщение").fill(message);
}

const submit = (page: Page) =>
  page.getByRole("button", { name: "Отправить заявку" });

test("1. happy-path: успех + корректный payload запроса", async ({ page }) => {
  let posted: Request | undefined;
  await page.route("**/api/lead", async (route) => {
    posted = route.request(); // захват ДО fulfill
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await fillForm(page, { message: "текст сообщения" });
  await page.getByRole("checkbox").check();
  await Promise.all([
    page.waitForRequest("**/api/lead"),
    submit(page).click(),
  ]);

  // UI: успех
  await expect(
    page.getByText("Заявка отправлена! Скоро свяжусь с вами."),
  ).toBeVisible();

  // Запрос: метод/URL/тело (5 ключей, без consent)
  expect(posted).toBeTruthy();
  expect(posted!.method()).toBe("POST");
  expect(new URL(posted!.url()).pathname).toBe("/api/lead");
  const body = posted!.postDataJSON();
  expect(body).toMatchObject({
    name: "Тест",
    contact: "@tester",
    message: "текст сообщения",
    company: "",
  });
  expect(body).toHaveProperty("service", "");
  expect(body).not.toHaveProperty("consent");

  // форма сброшена
  await expect(page.getByLabel(/Имя/)).toHaveValue("");
});

test("2. без согласия: submit заблокирован, НОЛЬ запросов", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/lead", (route) => {
    calls += 1;
    return route.abort();
  });

  // валидные поля (иначе форма упадёт на валидации ДО ветки согласия)
  await fillForm(page);
  // согласие НЕ отмечаем
  await submit(page).click();

  await expect(
    page.getByText("Чтобы отправить заявку, отметьте согласие."),
  ).toBeVisible();
  expect(calls).toBe(0);
  await expect(page.getByText(/Заявка отправлена/)).toHaveCount(0);
});

test("3. ошибка сервера: ошибка видна, успеха нет, кнопка снова активна", async ({
  page,
}) => {
  // Sentinel ≠ клиентский фолбэк → доказывает, что json.error реально
  // пробрасывается в UI (а не показывается захардкоженный текст).
  const SENTINEL = "СЕРВЕР-ОШИБКА-СЕНТИНЕЛ-42";
  await page.route("**/api/lead", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: SENTINEL }),
    }),
  );

  await fillForm(page);
  await page.getByRole("checkbox").check();
  await submit(page).click();

  await expect(page.getByText(SENTINEL)).toBeVisible();
  await expect(page.getByText(/Заявка отправлена/)).toHaveCount(0);
  await expect(submit(page)).toBeEnabled();
});

test("3b. сеть недоступна (abort) → сетевая ошибка (catch-ветка)", async ({
  page,
}) => {
  await page.route("**/api/lead", (route) => route.abort());

  await fillForm(page);
  await page.getByRole("checkbox").check();
  await submit(page).click();

  await expect(
    page.getByText("Проблема с сетью. Попробуйте позже."),
  ).toBeVisible();
  await expect(page.getByText(/Заявка отправлена/)).toHaveCount(0);
});
