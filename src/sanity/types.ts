/**
 * Общие view-типы данных секций (без "server-only" — могут импортироваться
 * в клиентские компоненты как типы). Маппинг из Sanity — в content.ts.
 */
import type { Service } from "@/lib/services";

/** Картинка секции: реальное фото (оптимизируется) или плейсхолдер. */
export type ResolvedImage = { src: string; unoptimized: boolean };

/** Услуга для компонентов: тип из src/lib + готовое изображение. */
export type ServiceView = Service & { image: ResolvedImage };

/**
 * Работа портфолио для компонентов.
 * cover — обложка карточки на сайте. gallery — фото для быстрого просмотра
 * (модалки), без обложки. unoptimized — true, если фото плейсхолдерные.
 */
export type PortfolioView = {
  id: string;
  number: string;
  title: string;
  shoot: string;
  description: string;
  date: string;
  cover: string;
  gallery: readonly string[];
  unoptimized: boolean;
};

/** Настройки сайта (поля, нужные секциям). Изображения — URL-строки. */
export type SiteSettingsView = {
  telegram?: string;
  instagram?: string;
  whatsapp?: string;
  phone?: string;
  email?: string;
  heroImage?: ResolvedImage;
  aboutTitle?: string;
  aboutText?: string;
  whyMeTitle?: string;
  whyMeText?: string;
  whyMeImage?: ResolvedImage;
  servicesTerms?: string;
  bookingIntro?: string;
};
