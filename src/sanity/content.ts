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

export function resolveImage(
  source: SanityImageSource | undefined | null,
  width = 1200,
): ResolvedImage {
  if (!source) return { src: PLACEHOLDER, unoptimized: true };
  try {
    return {
      src: urlFor(source).width(width).auto("format").url(),
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
  whatsapp?: string;
  phone?: string;
  email?: string;
  heroImage?: SanityImageSource;
  aboutTitle?: string;
  aboutText?: string;
  whyMeTitle?: string;
  whyMeText?: string;
  whyMeImage?: SanityImageSource;
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
      image: resolveImage(s.image, 900),
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
        ? resolveImage(p.coverImage, 1400).src
        : PLACEHOLDER;
      // Галерея быстрого просмотра — без обложки. Если пусто — показываем
      // обложку, чтобы окно просмотра не было пустым.
      const gallery = (p.gallery ?? [])
        .map((img) => resolveImage(img, 1600).src)
        .filter(Boolean);
      return {
        id: p._id,
        number: p.number ?? `#${i + 1}`,
        title: p.title,
        shoot: p.shoot ?? "",
        description: p.description ?? "",
        date: p.date ?? "",
        cover,
        gallery: gallery.length > 0 ? gallery : [cover],
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
    whatsapp: raw.whatsapp,
    phone: raw.phone,
    email: raw.email,
    heroImage: raw.heroImage ? resolveImage(raw.heroImage, 1860) : undefined,
    aboutTitle: raw.aboutTitle,
    aboutText: raw.aboutText,
    whyMeTitle: raw.whyMeTitle,
    whyMeText: raw.whyMeText,
    whyMeImage: raw.whyMeImage ? resolveImage(raw.whyMeImage, 1000) : undefined,
    servicesTerms: raw.servicesTerms,
    bookingIntro: raw.bookingIntro,
  };
}
