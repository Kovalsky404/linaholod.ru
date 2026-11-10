import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { CertificateShop } from "@/components/certificates/CertificateShop";
import { CERTIFICATES, CONTACT_EMAIL } from "@/lib/site-config";
import { pageMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/sanity/content";

/** ISR (сек): почта из Studio подтягивается без передеплоя. Литерал. */
export const revalidate = 60;

export const metadata: Metadata = pageMetadata({
  title: "Подарочный сертификат",
  description:
    "Подарочный сертификат lina H. на услуги стилиста и аренду одежды: пять дизайнов, номинал от 500 ₽. Оформление в Telegram или по почте.",
  path: CERTIFICATES.href,
});

export default async function CertificatesPage() {
  const settings = await getSiteSettings();
  // Почта из Studio важнее запасной из кода; пустая строка = почты нет.
  const email = settings?.email?.trim() || CONTACT_EMAIL || undefined;

  return (
    <section
      aria-label="Подарочный сертификат"
      className="container-site pt-4 pb-16 sm:pt-6 sm:pb-28"
    >
      <Breadcrumbs current="Подарочный сертификат" />
      <CertificateShop email={email} />
    </section>
  );
}
