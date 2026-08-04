import "server-only";
import type { SanityImageSource } from "@sanity/image-url";
import { urlFor } from "@/sanity/image";
import { sanityFetch } from "@/sanity/fetch";
import {
  portfolioQuery,
  reviewsQuery,
  servicesQuery,
  siteSettingsQuery,
} from "@/sanity/queries";
import type {
  PortfolioView,
  ResolvedImage,
  ServiceView,
  SiteSettingsView,
} from "@/sanity/types";

import { SERVICES } from "@/lib/services";
import { PORTFOLIO } from "@/lib/portfolio";
import { REVIEWS, type Review } from "@/lib/reviews";

const PLACEHOLDER = "/images/placeholder.svg";

/**
 * URL картинки из Sanity для next/image.
 *
 * `width` — это НЕ размер на экране, а размер ИСХОДНИКА, который получит
 * оптимизатор Next. Он никогда не апскейлит: если попросить у него 3840px,
 * а исходник 1860px, вернётся 1860px, и браузер растянет их сам — картинка
 * поплывёт. Поэтому width должен покрывать самый крупный показ с запасом
 * на retina (ширина блока в CSS-пикселях × 2).
 *
 * Два параметра URL держат резкость и меняться не должны:
 *
 * `fit=max` — запрет апскейла. Без него Sanity растягивает кадр до
 * запрошенной ширины, если исходник мельче (замерено: исходник 3004px при
 * запросе 3200 вернулся как 3200px — 6.5% пустых пикселей и лишний вес без
 * единой новой детали).
 *
 * Отсутствие `auto=format` — запрет двойного сжатия. С ним Sanity отдаёт свой
 * WebP, который Next пережимает повторно: вторая итерация давит уже
 * испорченные артефактами пиксели. Без него Sanity отдаёт исходный JPEG, и
 * сжатие происходит РОВНО ОДИН раз — в Next, который здесь единственный
 * оптимизатор (unoptimized всегда false для реальных картинок).
 */
export function resolveImage(
  source: SanityImageSource | undefined | null,
  width = 1200,
): ResolvedImage {
  if (!source) return { src: PLACEHOLDER, unoptimized: true };
  try {
    return {
      src: urlFor(source).width(width).fit("max").url(),
      unoptimized: false,
    };
  } catch {
    return { src: PLACEHOLDER, unoptimized: true };
  }
}

/** Первое число из цены — для JSON-LD (минимальная цена). Устойчиво к
 *  строке/числу/пустому: "10 000 – 35 000 ₽" → 10000, "от 4 000 ₽" → 4000. */
export function parsePrice(price: unknown): number {
  if (typeof price === "number") return price;
  if (typeof price !== "string") return 0;
  const m = price.replace(/\s/g, "").match(/\d+/);
  return m ? Number(m[0]) : 0;
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-zа-я0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

// ── Raw-типы из Sanity (минимально нужные поля) ──
type RawService = {
  _id: string;
  title: string;
  price: string;
  description?: string;
  image?: SanityImageSource;
};
type RawPortfolio = {
  _id: string;
  number?: string;
  title: string;
  shoot?: string;
  description?: string;
  date?: string;
  coverImage?: SanityImageSource;
  gallery?: SanityImageSource[];
  video?: string;
};
type RawReview = { _id: string; author: string; text: string; rating?: number };
type RawSettings = {
  telegram?: string;
  instagram?: string;
  phone?: string;
  email?: string;
  heroImage?: SanityImageSource;
  aboutTitle?: string;
  aboutText?: string;
  aboutGallery?: SanityImageSource[];
  whyMeTitle?: string;
  whyMeText?: string;
  whyMeImage?: SanityImageSource;
  certificatesImage?: SanityImageSource;
  servicesTerms?: string;
  bookingIntro?: string;
};

// ── Фетчеры с фолбэком на src/lib ──

/** Услуги: из Sanity (если есть) либо плейсхолдеры из src/lib. */
export async function getServices(): Promise<ServiceView[]> {
  const raw = await sanityFetch<RawService[]>(servicesQuery);
  if (raw && raw.length > 0) {
    return raw.map((s) => ({
      slug: slugify(s.title),
      title: s.title,
      price: s.price,
      priceValue: parsePrice(s.price),
      description: s.description ?? "",
      // 2000, а не 900: в модалке картинка занимает 45vw (на 1920 это 864
      // CSS-px, то есть 1728 на retina), в карточке — 37vw. Прежние 900
      // браузер растягивал почти вдвое.
      image: resolveImage(s.image, 2000),
    }));
  }
  return SERVICES.map((s) => ({
    ...s,
    image: { src: PLACEHOLDER, unoptimized: true },
  }));
}

/** Портфолио: из Sanity либо плейсхолдеры. */
export async function getPortfolio(): Promise<PortfolioView[]> {
  const raw = await sanityFetch<RawPortfolio[]>(portfolioQuery);
  if (raw && raw.length > 0) {
    return raw.map((p, i) => {
      const hasCover = Boolean(p.coverImage);
      const cover = hasCover
        ? // 1400 достаточно: обложка занимает 24vw (на 2560 это 614 CSS-px,
          // 1229 на retina). Увеличивать незачем — карточек в ленте много.
          resolveImage(p.coverImage, 1400).src
        : PLACEHOLDER;
      // Галерея быстрого просмотра — без обложки. Если пусто, подставляем
      // обложку, чтобы окно просмотра не было пустым — но ТОЛЬКО когда нет
      // видео: при видео окно и так не пустое, а обложка вторым слайдом
      // выглядела бы дублем.
      const hasVideo = Boolean(p.video);
      const gallery = (p.gallery ?? [])
        // 2400: в быстром просмотре кадр — 85vh в высоту, и на экране 4K
        // это 1224 CSS-px по ширине для портрета, то есть 2448 на retina.
        // 1600 не хватало уже на 2560×1440.
        .map((img) => resolveImage(img, 2400).src)
        .filter(Boolean);
      const galleryOrFallback =
        gallery.length > 0 ? gallery : hasVideo ? [] : [cover];
      return {
        id: p._id,
        number: p.number ?? `#${i + 1}`,
        title: p.title,
        shoot: p.shoot ?? "",
        description: p.description ?? "",
        date: p.date ?? "",
        cover,
        gallery: galleryOrFallback,
        video: p.video || undefined,
        unoptimized: !hasCover,
      };
    });
  }
  // Фолбэк из src/lib: первый кадр — обложка, остальные — галерея.
  return PORTFOLIO.map((p) => {
    const [first, ...rest] = p.images;
    const cover = first ?? PLACEHOLDER;
    return {
      id: p.id,
      number: p.number,
      title: p.title,
      shoot: p.shoot,
      description: p.description,
      date: p.date,
      cover,
      gallery: rest.length > 0 ? rest : [cover],
      unoptimized: true,
    };
  });
}

/** Отзывы: из Sanity либо плейсхолдеры. */
export async function getReviews(): Promise<Review[]> {
  const raw = await sanityFetch<RawReview[]>(reviewsQuery);
  if (raw && raw.length > 0) {
    return raw.map((r) => ({
      author: r.author,
      text: r.text,
      rating: r.rating ?? 5,
    }));
  }
  return [...REVIEWS];
}

/** Настройки сайта (singleton). null → компоненты используют свои дефолты. */
export async function getSiteSettings(): Promise<SiteSettingsView | null> {
  const raw = await sanityFetch<RawSettings>(siteSettingsQuery);
  if (!raw) return null;
  return {
    telegram: raw.telegram,
    instagram: raw.instagram,
    phone: raw.phone,
    email: raw.email,
    // Hero тянется во всю ширину контейнера (до 1604 CSS-px), значит на retina
    // ему нужно ~3200 реальных пикселей. Прежние 1860 браузер растягивал в
    // 1.7 раза — отсюда была видимая мыльность. Sanity не апскейлит: если
    // исходник меньше, вернётся его настоящий размер.
    heroImage: raw.heroImage ? resolveImage(raw.heroImage, 3200) : undefined,
    aboutTitle: raw.aboutTitle,
    aboutText: raw.aboutText,
    // 1400: самый крупный слот коллажа — 32vw (на 1920 это 614 CSS-px, то
    // есть 1228 на retina). Мелкие слоты по 15vw довольствуются меньшим, но
    // порядок задаётся в Studio и слот для кадра заранее неизвестен —
    // запрашиваем по самому крупному.
    aboutGallery: raw.aboutGallery?.map((i) => resolveImage(i, 1400)),
    whyMeTitle: raw.whyMeTitle,
    whyMeText: raw.whyMeText,
    // 2000: блок занимает 41vw (на 1920 это 787 CSS-px, 1574 на retina).
    whyMeImage: raw.whyMeImage ? resolveImage(raw.whyMeImage, 2000) : undefined,
    // 1200: колонка с кадром в окне — примерно 390 CSS-px на десктопе и
    // ширина экрана на мобильном, то есть до ~860 физических на retina.
    certificatesImage: raw.certificatesImage
      ? resolveImage(raw.certificatesImage, 1200)
      : undefined,
    servicesTerms: raw.servicesTerms,
    bookingIntro: raw.bookingIntro,
  };
}
