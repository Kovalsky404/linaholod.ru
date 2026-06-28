/**
 * Переменные окружения Sanity.
 * Публичные (NEXT_PUBLIC_*) доступны и на клиенте (нужны встроенной Studio).
 * Токен чтения — только на сервере (см. client.ts), сюда не попадает.
 *
 * Значения читаются мягко (с фолбэком), чтобы `next build` проходил даже без
 * заполненного .env.local. Реальные значения нужны в рантайме: без них Studio
 * не подключится и серверные запросы к Sanity не выполнятся.
 */

/** Версия API — дата YYYY-MM-DD. Фиксирует поведение API. */
export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-06-01";

/** Датасет (обычно production). */
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

/** Project ID из manage.sanity.io. Пустая строка до настройки .env.local. */
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "";

/** Настроен ли Sanity (есть Project ID) — для условной логики/предупреждений. */
export const isSanityConfigured = projectId.length > 0;
