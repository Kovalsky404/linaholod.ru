"use client";

import { useState } from "react";
import Image from "next/image";
import type { ServiceView } from "@/sanity/types";
import { Reveal } from "@/components/ui/Reveal";
import { Modal } from "@/components/ui/Modal";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Секция «Услуги».
 *
 * Макет (узел Figma 61:76): крупные чередующиеся ряды — большое фото (763×700)
 * и текстовый блок (название Inter Semi Bold 54px, цена Regular 54px, pill
 * «Подробнее» Inter 48px UPPER). Нечётные ряды зеркалятся (фото справа).
 *
 * Мобайл: каждый ряд стекается в колонку (фото сверху, текст снизу).
 * «Подробнее» открывает доступную модалку с описанием услуги.
 */
export function Services({
  services,
  terms,
}: {
  services: ServiceView[];
  terms?: string;
}) {
  const [active, setActive] = useState<ServiceView | null>(null);
  const termsList = (terms ?? "")
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <section
      id="services"
      className="scroll-mt-20 pb-6"
      aria-labelledby="services-heading"
    >
      <div className="container-site border-foreground/10 border-t pt-20 sm:pt-28">
        <Reveal>
          <SectionHeading id="services-heading">Услуги</SectionHeading>
        </Reveal>

        <ul className="mt-10 flex flex-col gap-14 lg:mt-16 lg:gap-24">
          {services.map((service, i) => {
            const imageRight = i % 2 === 1;
            // Фото — узкая колонка (≈40% ряда), текст получает больше воздуха.
            // Колонки зеркалятся, чтобы фото всегда оставалось узким.
            const cols = imageRight
              ? "lg:grid-cols-[3fr_2fr]"
              : "lg:grid-cols-[2fr_3fr]";
            return (
              <Reveal as="li" key={service.slug} delay={i * 80}>
                <article
                  className={`grid items-center gap-6 lg:gap-16 ${cols}`}
                >
                  {/* Фото 763:700 — узкая колонка */}
                  <div
                    className={`bg-placeholder relative aspect-[763/700] w-full overflow-hidden ${
                      imageRight ? "lg:order-2" : "lg:order-1"
                    }`}
                  >
                    <Image
                      src={service.image.src}
                      alt={`Услуга: ${service.title}`}
                      fill
                      loading="lazy"
                      unoptimized={service.image.unoptimized}
                      sizes="(max-width: 1024px) 92vw, 37vw"
                      className="object-cover"
                    />
                  </div>

                  {/* Текстовый блок */}
                  <div
                    className={`flex flex-col items-start gap-4 lg:gap-6 ${
                      imageRight ? "lg:order-1" : "lg:order-2"
                    }`}
                  >
                    <h3
                      className="heading-upper text-foreground font-semibold"
                      style={{ fontSize: "clamp(1.75rem,3.5vw,3.375rem)" }}
                    >
                      {service.title}
                    </h3>

                    <p
                      className="heading-upper text-foreground font-normal"
                      style={{ fontSize: "clamp(1.5rem,3vw,3.375rem)" }}
                    >
                      <span className="sr-only">Цена: </span>
                      {service.price}
                    </p>

                    <button
                      type="button"
                      onClick={() => setActive(service)}
                      aria-haspopup="dialog"
                      className="btn-pill mt-2 px-8 py-3 text-base font-medium sm:text-lg"
                    >
                      Подробнее
                    </button>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </ul>

        {/* Дополнительные условия — мелкий текст под услугами.
            Отступы минимальные и одинаковые сверху/снизу (mt = pt). */}
        {termsList.length > 0 ? (
          <Reveal
            as="ul"
            delay={80}
            className="border-foreground/10 text-gray mt-6 flex flex-col gap-1.5 border-t pt-6 text-sm leading-relaxed"
          >
            {termsList.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </Reveal>
        ) : null}
      </div>

      <Modal
        open={active !== null}
        onClose={() => setActive(null)}
        title={active?.title ?? ""}
        size="xl"
        bare
      >
        {active ? (
          <div className="flex flex-col md:flex-row md:items-start">
            {/* СЛЕВА: фото услуги. На десктопе закреплено (sticky), чтобы
                оставалось видимым при чтении длинного описания. */}
            <div className="bg-placeholder relative aspect-[763/700] w-full shrink-0 md:sticky md:top-0 md:aspect-auto md:h-[88vh] md:w-[44%]">
              <Image
                src={active.image.src}
                alt={`Услуга: ${active.title}`}
                fill
                unoptimized={active.image.unoptimized}
                sizes="(max-width: 768px) 100vw, 45vw"
                className="object-cover"
              />
            </div>

            {/* СПРАВА: название, цена, описание */}
            <div className="flex flex-col p-6 sm:p-8 md:w-[56%] md:p-10">
              <h3 className="heading-upper text-foreground pr-10 text-2xl font-bold sm:text-3xl">
                {active.title}
              </h3>
              <p className="heading-upper text-foreground mt-3 text-lg font-semibold">
                <span className="sr-only">Цена: </span>
                {active.price}
              </p>
              <div className="border-foreground/10 my-5 border-t" />
              <p className="text-muted text-base leading-relaxed whitespace-pre-line">
                {active.description}
              </p>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
