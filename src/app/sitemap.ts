import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { CERTIFICATES, RENT } from "@/lib/site-config";

/** Sitemap: главная + две подстраницы (каталог аренды и сертификаты). */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      // Каталог пополняется чаще остального сайта.
      url: `${SITE_URL}${RENT.href}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}${CERTIFICATES.href}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
