import "server-only";
import { client } from "@/sanity/client";
import { isSanityConfigured } from "@/sanity/env";

/** Интервал ISR-ревалидации (сек). Правки в Studio появляются без передеплоя. */
export const REVALIDATE = 60;

/**
 * Безопасный фетч из Sanity для серверных компонентов.
 *
 * - Если Sanity не настроен (нет projectId) — сразу возвращает null (фолбэк).
 * - Ошибки сети/запроса не валят рендер — логируем и возвращаем null.
 * - ISR: next.revalidate = 60с + тег "sanity" для точечной ревалидации.
 *
 * Вызывающий код при null/пустом результате использует данные из src/lib.
 */
export async function sanityFetch<T>(query: string): Promise<T | null> {
  if (!isSanityConfigured) return null;
  try {
    return await client.fetch<T>(
      query,
      {},
      { next: { revalidate: REVALIDATE, tags: ["sanity"] } },
    );
  } catch (err) {
    console.error("[sanity] fetch failed:", err);
    return null;
  }
}
