import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/**
 * Vitest — юнит/интеграционные тесты.
 * - JSX через esbuild (automatic runtime, React 19), без babel-плагина.
 * - Алиас @ → src (как в проекте).
 * - Окружение по умолчанию jsdom; серверные тесты (route, чистая логика)
 *   переключают на node докблоком `// @vitest-environment node`.
 * E2E — отдельно в Playwright (см. playwright.config.ts).
 */
export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
  test: {
    // forks/threads в Vitest 4.1 периодически роняют прогон ошибкой
    // «failed to find the runner»; vmThreads стабилен на этом тулчейне.
    pool: "vmThreads",
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "test/**/*.{test,spec}.{ts,tsx}"],
    css: false,
    clearMocks: true,
    restoreMocks: true,
  },
});
