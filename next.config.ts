import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Начиная с Next 16 список качеств обязателен: значение quality, которого
    // здесь нет, оптимизатор отвергает (400). 75 — дефолт для всей мелочи,
    // 90 — для hero: он во всю ширину экрана, и артефакты на нём видны.
    qualities: [75, 90],
    // Разрешаем оптимизацию изображений с CDN Sanity (фото из Studio).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;
