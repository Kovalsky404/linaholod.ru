"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CTA } from "@/lib/site-config";
import type { PortfolioView } from "@/sanity/types";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Modal } from "@/components/ui/Modal";

/**
 * Секция «Портфолио» — карусель работ + детальная модалка.
 *
 * Карусель: горизонтальный scroll-snap ряд (свайп на тач, скрытый скроллбар),
 * стрелки prev/next листают по одной карточке. Десктоп — несколько карточек,
 * мобайл — ~1.2. Клик/Enter по карточке открывает модалку с этой работой.
 *
 * Модалка (через Modal.tsx, bare+xl): слева крупное фото со стрелками и
 * счётчиком, справа метаданные. ← → листают, Esc/фокус-трап — из Modal.
 */
/** Соотношение сторон "W / H" из URL картинки Sanity (…-6000x4000.jpg). */
function aspectFromUrl(url: string): string | undefined {
  const m = url.match(/-(\d+)x(\d+)\.\w+/);
  if (!m) return undefined;
  return `${m[1]} / ${m[2]}`;
}

export function Portfolio({ items }: { items: PortfolioView[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Индекс открытой работы (null — модалка закрыта) и индекс фото внутри неё.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const active = activeIndex === null ? null : items[activeIndex];
  const photoCount = active ? active.gallery.length : 0;

  /** Открыть работу с первого кадра. */
  const openWork = useCallback((i: number) => {
    setActiveIndex(i);
    setPhotoIndex(0);
  }, []);

  // Состояние стрелок карусели (начало/конец прокрутки).
  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateEdges();
    el.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, [updateEdges]);

  const scrollByCard = useCallback((dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>("[data-card]");
    const step = first
      ? first.offsetWidth + 20 // ширина карточки + gap
      : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }, []);

  // Навигация ФОТО внутри открытой работы (циклично).
  const prevPhoto = useCallback(() => {
    if (photoCount === 0) return;
    setPhotoIndex((p) => (p - 1 + photoCount) % photoCount);
  }, [photoCount]);
  const nextPhoto = useCallback(() => {
    if (photoCount === 0) return;
    setPhotoIndex((p) => (p + 1) % photoCount);
  }, [photoCount]);

  // ← → листают ФОТО, пока открыта модалка.
  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevPhoto();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nextPhoto();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, prevPhoto, nextPhoto]);

  const arrowClass =
    "border-foreground text-foreground hover:bg-foreground hover:text-background inline-flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground";

  return (
    <section
      id="portfolio"
      className="scroll-mt-20 pb-20 sm:pb-28"
      aria-labelledby="portfolio-heading"
    >
      <div className="container-site border-foreground/10 border-t pt-20 sm:pt-28">
        {/* Шапка секции: заголовок + (стрелки) + CTA */}
        <Reveal className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <SectionHeading id="portfolio-heading">Портфолио</SectionHeading>

          <div className="flex items-center gap-4">
            {/* Стрелки карусели (десктоп/планшет) */}
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => scrollByCard(-1)}
                disabled={atStart}
                aria-label="Предыдущие работы"
                className={arrowClass}
              >
                <ChevronLeft size={22} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => scrollByCard(1)}
                disabled={atEnd}
                aria-label="Следующие работы"
                className={arrowClass}
              >
                <ChevronRight size={22} strokeWidth={2} />
              </button>
            </div>

            <a
              href={CTA.href}
              className="btn-pill px-5 py-2.5 text-sm font-medium"
            >
              {CTA.label}
            </a>
          </div>
        </Reveal>

        {/* Карусель */}
        <Reveal delay={80}>
          <ul
            ref={trackRef}
            className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth lg:mt-12"
            aria-label="Работы портфолио"
          >
            {items.map((item, i) => (
              <li
                key={item.id}
                data-card
                className="w-[78%] flex-none snap-start sm:w-[46%] lg:w-[31%] xl:w-[23.5%]"
              >
                <button
                  type="button"
                  onClick={() => openWork(i)}
                  aria-label={`Открыть работу: ${item.title} (${item.gallery.length} фото)`}
                  className="group block w-full text-left"
                >
                  <figure>
                    <div className="bg-placeholder relative aspect-[450/487] w-full overflow-hidden">
                      <Image
                        src={item.cover}
                        alt={`${item.title} — ${item.shoot}`}
                        fill
                        loading="lazy"
                        unoptimized={item.unoptimized}
                        sizes="(max-width: 640px) 78vw, (max-width: 1024px) 46vw, 24vw"
                        className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                      />
                    </div>
                    <figcaption className="bg-gray text-background heading-upper mt-2.5 flex items-center justify-between px-4 py-2 text-lg font-normal sm:text-xl">
                      <span>{item.number}</span>
                      <span className="text-background/70 text-sm normal-case">
                        {item.title}
                      </span>
                    </figcaption>
                  </figure>
                </button>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      {/* Детальная модалка */}
      <Modal
        open={active !== null}
        onClose={() => setActiveIndex(null)}
        title={active ? `${active.title} — портфолио` : ""}
        size="xl"
        bare
      >
        {active ? (
          <div className="flex flex-col md:flex-row md:items-start">
            {/* СЛЕВА: фото съёмки. Контейнер принимает соотношение сторон фото
                (из URL Sanity) → фото видно ЦЕЛИКОМ, без обрезки. На десктопе
                высота фиксирована (85vh), ширина следует за пропорцией фото. */}
            <div
              className="bg-placeholder relative w-full shrink-0 md:h-[85vh] md:w-auto"
              style={{
                aspectRatio:
                  aspectFromUrl(active.gallery[photoIndex] ?? "") ?? "3 / 2",
              }}
            >
              <Image
                key={photoIndex}
                src={active.gallery[photoIndex] ?? active.gallery[0]!}
                alt={`${active.title} — ${active.shoot}, фото ${photoIndex + 1} из ${photoCount}`}
                fill
                unoptimized={active.unoptimized}
                sizes="(max-width: 768px) 100vw, 60vw"
                className="object-contain"
              />

              {photoCount > 1 ? (
                <>
                  {/* Кликабельные половины фото: левая — назад, правая — вперёд.
                      group/* подсвечивает стрелку-подсказку при наведении. */}
                  <button
                    type="button"
                    onClick={prevPhoto}
                    aria-label="Предыдущее фото"
                    className="group/prev absolute inset-y-0 left-0 z-10 w-1/2 cursor-pointer focus:outline-none"
                  >
                    <span
                      aria-hidden="true"
                      className="bg-background/80 text-foreground absolute top-1/2 left-3 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full opacity-0 backdrop-blur transition-opacity duration-200 ease-out group-hover/prev:opacity-100 group-focus-visible/prev:opacity-100"
                    >
                      <ChevronLeft size={22} strokeWidth={2} />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={nextPhoto}
                    aria-label="Следующее фото"
                    className="group/next absolute inset-y-0 right-0 z-10 w-1/2 cursor-pointer focus:outline-none"
                  >
                    <span
                      aria-hidden="true"
                      className="bg-background/80 text-foreground absolute top-1/2 right-3 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full opacity-0 backdrop-blur transition-opacity duration-200 ease-out group-hover/next:opacity-100 group-focus-visible/next:opacity-100"
                    >
                      <ChevronRight size={22} strokeWidth={2} />
                    </span>
                  </button>
                </>
              ) : null}

              {/* Индикатор: текущее фото / всего фото в работе */}
              <div
                className="bg-foreground/70 text-background pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full px-3 py-1 text-xs tracking-wider"
                aria-live="polite"
              >
                {photoIndex + 1} / {photoCount}
              </div>
            </div>

            {/* СПРАВА: метаданные (фикс. ширина на десктопе — панель хугает фото+текст) */}
            <div className="flex flex-col p-6 sm:p-8 md:w-[380px] md:shrink-0 md:p-10">
              <p className="text-gray heading-upper text-sm">{active.number}</p>

              <h3 className="heading-upper text-foreground mt-3 pr-10 text-2xl font-bold sm:text-3xl">
                {active.title}
              </h3>

              <p className="text-muted mt-2 text-sm tracking-wide uppercase">
                {active.shoot}
              </p>

              <div className="border-foreground/10 my-6 border-t" />

              <p className="text-muted text-base leading-relaxed">
                {active.description}
              </p>

              <div className="border-foreground/10 my-6 border-t" />

              <dl className="flex items-center justify-between text-sm">
                <dt className="text-gray uppercase">Дата</dt>
                <dd className="text-foreground">{active.date}</dd>
              </dl>

              <a
                href={CTA.href}
                onClick={() => setActiveIndex(null)}
                className="btn-pill mt-8 px-6 py-3 text-sm font-medium"
              >
                {CTA.label}
              </a>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
