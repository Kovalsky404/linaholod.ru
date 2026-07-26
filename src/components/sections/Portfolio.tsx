"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/** Числовое W/H из того же URL (для расчёта ширины кадра). */
function aspectRatioNumber(url: string): number {
  const m = url.match(/-(\d+)x(\d+)\.\w+/);
  const w = Number(m?.[1]);
  const h = Number(m?.[2]);
  return m && w > 0 && h > 0 ? w / h : 1.5; // фолбэк — 3/2, как у контейнера
}

/**
 * sizes для кадра в быстром просмотре.
 *
 * На md+ колонка с медиа — `h-[85vh] w-auto`, то есть её ширина равна
 * 85vh × (W/H) кадра и НЕ зависит от ширины окна. Поэтому любое фиксированное
 * значение во vw обязательно врёт: 60vw переоценивало на десктопе с портретом,
 * 40vw недооценивало на планшете (запрашивалась картинка 384px в блок 669px —
 * видимое растягивание). Выражаем ровно ту же формулу, что и в раскладке.
 */
function slideSizes(url: string): string {
  // 767px, а не 768: Tailwind md: — это min-width:768px, и ровно на 768
  // подсказка sizes расходилась бы с фактической раскладкой.
  return `(max-width: 767px) 100vw, calc(85vh * ${aspectRatioNumber(url).toFixed(3)})`;
}

/**
 * Состав работы для aria-label карточки: «видео», «N фото» или «видео и N фото».
 * Видео названо словом, а не приплюсовано к числу, — иначе у видео-работы с
 * пустой галереей подпись читалась бы как «0 фото» на непустой работе.
 * (Счётчик в модалке считает иначе — там видео это слайд, поэтому «видео и
 * 2 фото» соответствует «1 / 3».) «фото» несклоняемо — форма одна для любых чисел.
 */
function describeContents(item: PortfolioView): string {
  const photos = item.gallery.length;
  if (item.video) return photos > 0 ? `видео и ${photos} фото` : "видео";
  return `${photos} фото`;
}

export function Portfolio({ items }: { items: PortfolioView[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Индекс открытой работы (null — модалка закрыта) и индекс фото внутри неё.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const active = activeIndex === null ? null : items[activeIndex];

  // Слайды быстрого просмотра: видео (если есть) — первым, затем фото галереи.
  const slides = active
    ? [
        ...(active.video
          ? [{ kind: "video" as const, src: active.video }]
          : []),
        ...active.gallery.map((src) => ({ kind: "image" as const, src })),
      ]
    : [];
  const photoCount = slides.length;
  const current = slides[photoIndex] ?? slides[0];

  // Окно предзагрузки: держим в DOM текущий кадр и обоих соседей (циклично).
  // Это даёт сразу два эффекта: сосед уже загружен к моменту клика (нет
  // ожидания) и оба кадра существуют одновременно — значит возможен crossfade.
  const windowIndices = useMemo(() => {
    if (photoCount === 0) return new Set<number>();
    return new Set([
      photoIndex,
      (photoIndex - 1 + photoCount) % photoCount,
      (photoIndex + 1) % photoCount,
    ]);
  }, [photoIndex, photoCount]);

  // Видео не должно продолжать играть, пока оно вне экрана (скрыто прозрачностью).
  // Слайд с видео в работе не больше одного (см. сборку slides выше), поэтому
  // одного ref достаточно.
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (current?.kind === "video") {
      // play() возвращает Promise не везде (старые браузеры, jsdom) — проверяем.
      const p: unknown = v.play();
      if (p instanceof Promise) p.catch(() => {});
    } else {
      v.pause();
    }
    // Пауза при закрытии модалки. Полагаться на ветку выше нельзя: при закрытии
    // <video> размонтируется, ref обнуляется ДО повторного запуска эффекта, и
    // `if (!v) return` вышел бы раньше паузы — отцепленный элемент продолжал бы
    // играть и тянуть данные. Ссылку держим в замыкании.
    return () => {
      v.pause();
    };
  }, [photoIndex, activeIndex, current?.kind]);

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
      // Если фокус на плеере — не перехватываем: там ←/→ означают перемотку,
      // и preventDefault лишал бы пользователя штатного управления видео.
      if ((e.target as HTMLElement | null)?.tagName === "VIDEO") return;
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
      className="scroll-mt-20 pb-8 sm:pb-28"
      aria-labelledby="portfolio-heading"
    >
      <div className="container-site border-foreground/10 border-t pt-8 sm:pt-28">
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

            {/* На мобайле кнопку убираем отсюда — она ниже, под работами. */}
            <a
              href={CTA.href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-pill hidden px-5 py-2.5 text-sm font-medium sm:inline-flex"
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
                  aria-label={`Открыть работу: ${item.title} (${describeContents(item)})`}
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

        {/* CTA под работами — только мобайл (на десктопе кнопка в шапке секции). */}
        <Reveal delay={120} className="mt-8 flex justify-center sm:hidden">
          <a
            href={CTA.href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-pill w-fit px-7 py-2.5 text-sm font-medium"
          >
            {CTA.label}
          </a>
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
              className={`bg-placeholder relative w-full shrink-0 transition-[aspect-ratio] duration-300 ease-out md:h-[85vh] md:w-auto ${
                current?.kind === "video"
                  ? "flex items-center justify-center"
                  : ""
              }`}
              style={
                current?.kind === "video"
                  ? undefined
                  : {
                      aspectRatio: aspectFromUrl(current?.src ?? "") ?? "3 / 2",
                    }
              }
            >
              {/* Слайды стопкой: активный непрозрачен, соседи ждут наготове с
                  opacity:0. Переключение = crossfade, без пересоздания <img>. */}
              {slides.map((slide, i) => {
                if (!windowIndices.has(i)) return null;
                const isActive = i === photoIndex;
                const fade = `transition-opacity duration-300 ease-out ${
                  isActive ? "opacity-100" : "pointer-events-none opacity-0"
                }`;
                // Ключ позиционный: галерея в Sanity не гарантирует уникальность
                // URL, а один и тот же src дважды дал бы коллизию ключей и
                // «пропавший» слайд. Индекс стабилен — slides строится по порядку.
                const key = `${i}-${slide.src}`;
                return slide.kind === "video" ? (
                  <div
                    key={key}
                    aria-hidden={!isActive}
                    // inert убирает неактивный слайд из tab-порядка: aria-hidden
                    // и opacity:0 фокус НЕ снимают, и <video controls> иначе
                    // ловил бы табы внутри aria-hidden (нарушение a11y).
                    inert={!isActive}
                    data-slide={slide.kind}
                    data-active={isActive}
                    // АКТИВНОЕ видео должно быть В ПОТОКЕ: у контейнера в
                    // видео-режиме нет aspect-ratio, и высоту задаёт именно оно.
                    // Если сделать его absolute, контейнер схлопнется в 0, а
                    // видео вылезет поверх текста. Неактивное — absolute, чтобы
                    // не влиять на раскладку, пока ждёт своей очереди.
                    className={`flex items-center justify-center ${
                      isActive ? "relative" : "absolute inset-0"
                    } ${fade}`}
                  >
                    <video
                      ref={videoRef}
                      src={slide.src}
                      // poster намеренно НЕ ставим: он подменял бы неиграющее
                      // видео обложкой, из-за чего непроигрываемый файл выглядел
                      // бы «как задумано», и это было бы единственное прямое
                      // обращение браузера к cdn.sanity.io мимо оптимизатора.
                      // Без autoPlay: воспроизведением управляет эффект ниже.
                      // autoPlay на соседнем (скрытом) слайде заставлял браузер
                      // тянуть видео как preload="auto". preload — это подсказка
                      // ВЫБОРА стратегии: она не обрывает уже начавшуюся
                      // загрузку, но не даёт ей стартовать у слайда, который
                      // активным ещё не был.
                      preload={isActive ? "auto" : "none"}
                      muted
                      loop
                      playsInline
                      controls={isActive}
                      tabIndex={isActive ? undefined : -1}
                      className="max-h-[70vh] w-auto max-w-full md:max-h-[85vh]"
                    />
                  </div>
                ) : (
                  <Image
                    key={key}
                    src={slide.src}
                    alt={
                      isActive
                        ? `${active.title} — ${active.shoot}, кадр ${photoIndex + 1} из ${photoCount}`
                        : ""
                    }
                    aria-hidden={!isActive}
                    fill
                    unoptimized={active.unoptimized}
                    // Видимый кадр важнее соседей: без явного приоритета все три
                    // запроса шли с одинаковым весом и делили канал поровну.
                    // Именно fetchPriority, без priority/preload: priority в
                    // Next 16 объявлен устаревшим, а для наложенных стопкой
                    // картинок дока предписывает ровно fetchPriority
                    // (node_modules/next/dist/docs/.../image.md, «Good to know»
                    // в разделе про тему) — preload здесь ещё и плодил бы
                    // неудаляемые <link rel=preload> в <head>.
                    fetchPriority={isActive ? "high" : "low"}
                    sizes={slideSizes(slide.src)}
                    className={`object-contain ${fade}`}
                  />
                );
              })}

              {photoCount > 1 ? (
                <>
                  {/* Кликабельные зоны листания: левая — назад, правая — вперёд.
                      group/* подсвечивает стрелку-подсказку при наведении.
                      На ВИДЕО-слайде это узкие полосы у краёв, обрезанные снизу
                      (bottom-16): иначе они накрывали бы панель управления
                      плеером — и по краям, и по низу, — и мышью до неё было бы
                      не добраться. Оговорка: попав в родные контролы плеера,
                      Escape браузер съедает и модалка им уже не закрывается —
                      выход через Tab до «Закрыть» или клик по фону. */}
                  <button
                    type="button"
                    onClick={prevPhoto}
                    aria-label="Предыдущий кадр"
                    className={`group/prev absolute top-0 left-0 z-10 cursor-pointer focus:outline-none ${
                      current?.kind === "video"
                        ? "bottom-16 w-16"
                        : "bottom-0 w-1/2"
                    }`}
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
                    aria-label="Следующий кадр"
                    className={`group/next absolute top-0 right-0 z-10 cursor-pointer focus:outline-none ${
                      current?.kind === "video"
                        ? "bottom-16 w-16"
                        : "bottom-0 w-1/2"
                    }`}
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

              {/* Индикатор «текущий / всего» — только когда есть что считать.
                  При единственном слайде «1 / 1» не несёт информации, а у
                  видео-работы ещё и ложился на панель управления плеером. */}
              {photoCount > 1 ? (
                <div
                  className="bg-foreground/70 text-background pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full px-3 py-1 text-xs tracking-wider"
                  aria-live="polite"
                >
                  {photoIndex + 1} / {photoCount}
                </div>
              ) : null}
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
                target="_blank"
                rel="noopener noreferrer"
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
