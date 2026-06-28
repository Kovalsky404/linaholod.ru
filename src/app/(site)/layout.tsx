import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, buildJsonLd } from "@/lib/seo";
import { getServices, getSiteSettings } from "@/sanity/content";

/** ISR (сек) — правки в Studio появляются без передеплоя. Должен быть литералом. */
export const revalidate = 60;

const TITLE_DEFAULT = "lina H. — персональный стилист";

/**
 * Лейаут публичного сайта: метаданные, JSON-LD, шапка/футер.
 * Встроенная Studio (/studio) вне этой группы — без хрома сайта.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE_DEFAULT,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "стилист",
    "персональный шопинг",
    "разбор гардероба",
    "консультация стилиста",
    "имидж",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    siteName: SITE_NAME,
    title: TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "lina H. — персональный стилист",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [settings, services] = await Promise.all([
    getSiteSettings(),
    getServices(),
  ]);

  // JSON-LD из Sanity (услуги + соцссылки) с фолбэком внутри buildJsonLd.
  const sameAs = settings
    ? [settings.telegram, settings.instagram, settings.whatsapp].filter(
        (u): u is string => Boolean(u) && u !== "#",
      )
    : undefined;
  const jsonLd = buildJsonLd({
    services: services.map((s) => ({
      title: s.title,
      priceValue: s.priceValue,
    })),
    sameAs: sameAs && sameAs.length > 0 ? sameAs : undefined,
  });

  return (
    <div className="flex min-h-full flex-col">
      {/* Структурированные данные (schema.org) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <span id="top" aria-hidden="true" />
      <Header />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer
        social={
          settings
            ? {
                telegram: settings.telegram,
                instagram: settings.instagram,
                whatsapp: settings.whatsapp,
              }
            : undefined
        }
      />
    </div>
  );
}
