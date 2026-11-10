import { defineConfig, devices } from "@playwright/test";

// .env.local в РАННЕР не загружаем: спекам он не нужен (условия выводятся из
// отданной страницы, а не из окружения), а файл содержит токены — незачем
// тянуть их в процесс раннера и его отчёты. Дочерний webServer (next dev) свой
// .env.local читает сам — иначе сайту нечем было бы ходить в Sanity.

/**
 * E2E-конфиг (Playwright). Дев-сервер Next на 3210; локально переиспользуем
 * уже запущенный, в CI — поднимаем свежий. Мобильный проект — только для
 * *.mobile.spec.ts (бургер-меню на телефонном вьюпорте).
 */
const PORT = 3210;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL,
    // Приветственное окно «−10%» всплывает через 3 с и перекрывает страницу:
    // клики спеков, не связанных с ним, попадали бы в оверлей. Помечаем его
    // как уже показанное. Сам сценарий окна (e2e/pages.spec.ts) сбрасывает
    // это состояние у себя.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: baseURL,
          localStorage: [{ name: "lh:welcome-offer:v1", value: "e2e" }],
        },
      ],
    },
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /\.mobile\.spec\.ts$/,
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
      testMatch: /\.mobile\.spec\.ts$/,
    },
  ],
});
