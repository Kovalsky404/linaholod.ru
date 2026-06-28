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
      <div className="container-site">
        <div className="bg-placeholder relative aspect-[1860/1000] w-full overflow-hidden">
          <Image
            src={src}
            alt=""
            fill
            priority
            unoptimized={unoptimized}
            sizes="(max-width: 1860px) 100vw, 1860px"
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
