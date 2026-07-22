/**
 * Чистые помощники для сборки Telegram-сообщения заявки.
 * Вынесены из API-route, чтобы: (1) юнит-тестировать ветки без запуска
 * хендлера; (2) не держать лишние именованные экспорты в route-файле
 * (Next трактует их как конфиг маршрута и предупреждает).
 * Поведение идентично прежней реализации внутри route.ts.
 */

/** Экранирование под parse_mode:"HTML" (порядок важен: & первым). */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Делает контакт кликабельным:
 * - Telegram-логин (@user / user / t.me/user / ссылка) → ссылка на чат + @user;
 * - телефон (цифры, +, скобки, дефисы) → tel:-ссылка с нормализованным номером;
 * - иначе — экранированный текст как есть.
 */
export function formatContact(raw: string): string {
  const value = raw.trim();

  // Telegram: t.me/user, https://t.me/user, @user
  const tme = value.match(/(?:https?:\/\/)?(?:t\.me|telegram\.me)\/(\w{3,})/i);
  if (tme && tme[1]) {
    const user = tme[1];
    return `<a href="https://t.me/${user}">@${escapeHtml(user)}</a>`;
  }
  if (/^@?[a-zA-Z][\w]{3,31}$/.test(value)) {
    const user = value.replace(/^@/, "");
    return `<a href="https://t.me/${user}">@${escapeHtml(user)}</a>`;
  }

  // Телефон: достаточно цифр, допустимы + ( ) - пробелы
  const digits = value.replace(/[^\d+]/g, "");
  if (/^\+?\d{7,15}$/.test(digits) && /^[\d\s+()-]+$/.test(value)) {
    return `<a href="tel:${digits}">${escapeHtml(value)}</a>`;
  }

  return escapeHtml(value);
}
