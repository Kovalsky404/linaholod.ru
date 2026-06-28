import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
