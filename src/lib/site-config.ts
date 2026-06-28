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

/** Подпись и якорь кнопки-CTA «Записаться» — ведёт на форму заявки. */
export const CTA = {
  label: "Записаться",
  href: "#book" as const,
};

export type SocialLink = {
  /** Машинный ключ — выбирает иконку в компоненте. */
  key: "telegram" | "instagram" | "whatsapp";
  /** Доступное имя для aria-label. */
  label: string;
  href: string;
};

/**
 * Соцсети. Telegram и Instagram — реальные ссылки из брифа.
 * WhatsApp — заглушка, заменить на wa.me/<номер> когда клиент даст номер.
 */
export const SOCIAL_LINKS: readonly SocialLink[] = [
  {
    key: "telegram",
    label: "Telegram",
    href: "https://t.me/AHL2060",
  },
  {
    key: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/_bulochka__s__makom_/",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    // TODO: заменить на реальный номер — https://wa.me/<phone>
    href: "#",
  },
] as const;

/** Текстовый логотип. */
export const BRAND = {
  /** Логотип в шапке. */
  name: "lina H.",
  /** Гигантская подпись в футере (без точки, как в макете). */
  wordmark: "lina H",
} as const;
