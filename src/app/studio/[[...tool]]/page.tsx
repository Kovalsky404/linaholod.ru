/**
 * Встроенная Sanity Studio на маршруте /studio (и всех вложенных).
 *
 * Использует конфиг из корневого sanity.config.ts. Рендерится клиентски
 * (NextStudio). Метаданные/вьюпорт берутся из next-sanity/studio.
 */
import { NextStudio } from "next-sanity/studio";
import config from "../../../../sanity.config";

// Studio рендерится динамически (клиентский интерфейс с авторизацией).
export const dynamic = "force-dynamic";

export { metadata, viewport } from "next-sanity/studio";

export default function StudioPage() {
  return <NextStudio config={config} />;
}
