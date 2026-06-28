"use client";

import { useState } from "react";
import Image from "next/image";
import type { ResolvedImage } from "@/sanity/types";

/**
 * Hero — крупный блок-изображение под шапкой (1860:1000).
 * Фото из Sanity (siteSettings.heroImage) с фолбэком на плейсхолдер.
 * next/image с priority (LCP) и мягким fade-in после загрузки.
 */
export function Hero({ image }: { image?: ResolvedImage } = {}) {
  const [loaded, setLoaded] = useState(false);
  const src = image?.src ?? "/images/placeholder.svg";
  const unoptimized = image?.unoptimized ?? true;

  return (
    <section aria-label="Главное изображение">
      {/* Мобайл: фото full-bleed (от края до края) высотой ~50vh, по центру.
          Десктоп (sm+): контейнер 1700px с пропорцией 1860:1000. */}
      <div className="mx-auto w-full sm:max-w-[1700px] sm:px-8 lg:px-12">
        <div className="bg-placeholder relative h-[52svh] w-full overflow-hidden sm:aspect-[1860/1000] sm:h-auto">
          <Image
            src={src}
            alt=""
            fill
            priority
            unoptimized={unoptimized}
            sizes="100vw"
            onLoad={() => setLoaded(true)}
            className={`object-cover transition-opacity duration-300 ease-out ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>
      </div>
    </section>
  );
}
