/**
 * Единый источник правды для навигации, контактов и соцсетей.
 * Компоненты импортируют отсюда — никаких хардкод-ссылок в разметке.
 */

export type NavLink = {
  /** Подпись пункта меню (как в макете, UPPERCASE применяется через CSS). */
  label: string;
  /** Якорь секции на странице. */
  href: `#${string}`;
};

/** Пункты меню. Порядок совпадает с порядком секций на странице. */
export const NAV_LINKS: readonly NavLink[] = [
  { label: "Обо мне", href: "#about" },
  { label: "Портфолио", href: "#portfolio" },
  { label: "Услуги", href: "#services" },
  { label: "Отзывы", href: "#reviews" },
  { label: "Контакты", href: "#contacts" },
] as const;

/** Кнопка-CTA «Записаться» — ведёт в Telegram-чат (внешняя ссылка).
 *  Формы заявки на сайте нет (не собираем ПД, вне 152-ФЗ). */
export const CTA = {
  label: "Записаться",
  href: "https://t.me/holod_styling",
  /** Внешняя ссылка — открывать в новой вкладке (target=_blank + rel). */
  external: true,
} as const;

/**
 * Ссылка на рабочий Telegram-чат с уже набранным сообщением.
 *
 * Параметр `text` у ссылок t.me/<username> — официальный (core.telegram.org/
 * api/links): клиент подставляет его в поле ввода, отправляет человек сам.
 * Так менеджер сразу видит, о какой вещи, сумме или скидке речь, а сайт по-
 * прежнему ничего не собирает и не хранит. Старый клиент без поддержки просто
 * откроет чат — ссылка не ломается.
 */
export function telegramMessage(text: string): string {
  return `${CTA.href}?text=${encodeURIComponent(text)}`;
}

/** Письмо с заполненной темой и текстом — для кнопок «По почте». */
export function mailMessage(email: string, subject: string, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Почта для кнопок «По почте» (сертификаты). Поле «E-mail» в настройках
 * Studio важнее; это значение — по умолчанию, если поле пустое.
 * Пустая строка = почты нет: кнопка «По почте» не показывается, а в условиях
 * остаётся только Telegram. Ссылки «в никуда» хуже отсутствующей кнопки.
 */
export const CONTACT_EMAIL = "info@linaholod.ru";

/**
 * «Аренда одежды» — отдельная страница-каталог. Сами вещи живут в Instagram
 * проката, на сайте — их первые кадры со ссылками на посты.
 * Не пункт NAV_LINKS: там только якоря секций главной.
 */
export const RENT = {
  label: "Аренда одежды",
  href: "/rent",
} as const;

/** Instagram проката — профиль целиком (у каждой вещи ещё своя ссылка на пост). */
export const RENT_INSTAGRAM = {
  handle: "@holod.rent",
  href: "https://www.instagram.com/holod.rent/",
} as const;

/** «Сертификаты» — отдельная страница с выбором дизайна и номинала. */
export const CERTIFICATES = {
  label: "Сертификаты",
  href: "/certificates",
} as const;

export type SocialLink = {
  /** Машинный ключ — выбирает иконку в компоненте. */
  key: "telegram" | "instagram";
  /** Доступное имя для aria-label. */
  label: string;
  href: string;
};

/**
 * Соцсети в футере. Telegram здесь — КАНАЛ, а не рабочий чат: написать можно
 * через кнопку «Записаться» рядом, а иконка ведёт туда, где можно следить за
 * новостями. Переопределяется полем «Telegram-канал» в Studio.
 */
export const SOCIAL_LINKS: readonly SocialLink[] = [
  {
    key: "telegram",
    label: "Telegram-канал",
    href: "https://t.me/asitwas_bylina",
  },
  {
    key: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/_bulochka__s__makom_/",
  },
] as const;

/** Текстовый логотип. */
export const BRAND = {
  /** Логотип в шапке. */
  name: "lina H.",
  /** Гигантская подпись в футере (без точки, как в макете). */
  wordmark: "lina H",
} as const;
