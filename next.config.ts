import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone — так же, как запускается соседний проект на том же сервере:
  // systemd стартует `node server.js`, а не `npm run start`. Next кладёт в
  // .next/standalone самодостаточный сервер с нужными кусками node_modules:
  // 36 МБ на сервере вместо 862 МБ (замерено). node_modules после сборки
  // можно не хранить.
  //
  // Осторожно: standalone НЕ включает .next/static и public — их копирует
  // deploy/deploy.sh. Забыть их значит получить сайт без стилей и картинок.
  output: "standalone",
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
