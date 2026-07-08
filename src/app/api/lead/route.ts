import { NextResponse } from "next/server";
import { normalizeLead, validateLead } from "@/lib/lead";

/**
 * POST /api/lead — приём заявки с формы и отправка в Telegram.
 *
 * Безопасность:
 * - валидация на сервере (не доверяем клиенту);
 * - honeypot-поле company: если заполнено — тихо «успех», в Telegram не шлём;
 * - in-memory rate-limit по IP;
 * - токен бота только на сервере (process.env), на клиент не уходит;
 * - наружу — обобщённые сообщения без деталей.
 */

export const runtime = "nodejs";

// ── Примитивный rate-limit (in-memory). Для одного инстанса достаточно;
//    при нескольких инстансах нужен общий стор (Redis/Upstash). ──
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  // Лёгкая уборка, чтобы Map не рос бесконечно.
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

function getIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Делает контакт кликабельным:
 * - Telegram-логин (@user / user / t.me/user / ссылка) → ссылка на чат + @user;
 * - телефон (цифры, +, скобки, дефисы) → tel:-ссылка с нормализованным номером;
 * - иначе — экранированный текст как есть.
 */
function formatContact(raw: string): string {
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

/** Шлёт сообщение одному chat_id. true — доставлено. */
async function sendToChat(
  token: string,
  chatId: string,
  text: string,
): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error(`[lead] Telegram API ответил ${res.status} (chat ${chatId})`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[lead] Сбой запроса к Telegram (chat ${chatId})`, err);
    return false;
  }
}

async function sendToTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const raw = process.env.TELEGRAM_CHAT_ID;
  if (!token || !raw) {
    // Не настроено окружение — логируем на сервере, наружу отдаём 500.
    console.error("[lead] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID не заданы");
    return false;
  }

  // Можно указать несколько получателей через запятую/пробел/точку с запятой.
  const chatIds = raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (chatIds.length === 0) {
    console.error("[lead] TELEGRAM_CHAT_ID пуст после разбора");
    return false;
  }

  const results = await Promise.all(
    chatIds.map((chatId) => sendToChat(token, chatId, text)),
  );
  // Успех, если заявка доставлена хотя бы одному получателю.
  return results.some(Boolean);
}

export async function POST(req: Request) {
  if (rateLimited(getIp(req))) {
    return NextResponse.json(
      { ok: false, error: "Слишком много запросов. Попробуйте позже." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Некорректный запрос." },
      { status: 400 },
    );
  }

  const lead = normalizeLead((body ?? {}) as Record<string, unknown>);

  // Honeypot: бот заполнил скрытое поле — притворяемся, что всё ок.
  if (lead.company) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const errors = validateLead(lead);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { ok: false, error: "Проверьте поля формы.", fields: errors },
      { status: 400 },
    );
  }

  const divider = "➖➖➖➖➖➖➖➖➖➖";
  const lines = [
    "🔔 <b>Новая заявка с сайта</b>",
    divider,
    `👤 <b>Имя</b>\n${escapeHtml(lead.name)}`,
    `📞 <b>Контакт</b>\n${formatContact(lead.contact)}`,
  ];
  if (lead.service) {
    lines.push(`✂️ <b>Услуга</b>\n${escapeHtml(lead.service)}`);
  }
  if (lead.message) {
    lines.push(`💬 <b>Сообщение</b>\n${escapeHtml(lead.message)}`);
  }
  lines.push(divider, "🌐 <i>Lina H. — стилист</i>");

  // Поля разделяем пустой строкой — в Telegram читается как карточки.
  const sent = await sendToTelegram(lines.join("\n\n"));
  if (!sent) {
    return NextResponse.json(
      { ok: false, error: "Не удалось отправить заявку. Попробуйте позже." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
