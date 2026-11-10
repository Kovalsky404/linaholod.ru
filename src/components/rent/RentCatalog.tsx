"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { RentalItemView } from "@/sanity/types";
import { RENT_INSTAGRAM, telegramMessage } from "@/lib/site-config";
import {
  RENTAL_CATEGORIES,
  RENT_FACTS,
  itemsCount,
  rentalRequest,
  splitPrice,
} from "@/lib/rent";
import { Modal } from "@/components/ui/Modal";
import { InstagramGlyph } from "@/components/ui/SocialIcon";

const ALL = "Все";

/** Чип фильтра: та же pill-геометрия, выбранный — залит. */
const chipClass =
  "border-foreground/15 text-foreground hover:border-foreground aria-pressed:bg-foreground aria-pressed:text-background aria-pressed:border-foreground inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[var(--radius-pill)] border px-4 text-sm whitespace-nowrap transition-colors duration-200 ease-out";

/** Плашка категории поверх кадра. */
const badgeClass =
  "bg-background/85 text-foreground pointer-events-none absolute top-2.5 left-2.5 rounded-[var(--radius-pill)] px-2.5 py-1 text-[0.625rem] uppercase backdrop-blur-sm sm:top-3 sm:left-3 sm:text-[0.6875rem]";

/** Цена: сумма крупно, «/ сутки» мельче серым. */
function Price({ price, size = "sm" }: { price: string; size?: "sm" | "lg" }) {
  const { amount, unit } = splitPrice(price);
  return (
    <span className="whitespace-nowrap">
      <span
        className={
          size === "lg"
            ? "text-2xl font-semibold sm:text-3xl"
            : "text-sm font-semibold sm:text-base"
        }
      >
        {amount}
      </span>
      {unit ? (
        <span
          className={`text-gray font-normal ${size === "lg" ? "text-base" : "text-xs sm:text-sm"}`}
        >
          {" "}
          {unit}
        </span>
      ) : null}
    </span>
  );
}

function bookingHref(item: RentalItemView) {
  return telegramMessage(rentalRequest(item.title, item.instagramUrl));
}

function RentalCard({
  item,
  onOpen,
}: {
  item: RentalItemView;
  onOpen: () => void;
}) {
  const post = item.instagramUrl ?? RENT_INSTAGRAM.href;
  const note = item.price ? splitPrice(item.price).note : undefined;
  return (
    <article className="flex h-full flex-col">
      {/* Кадр открывает быстрый просмотр: на телефоне карточка узкая, и
          рассмотреть вещь можно только крупнее. */}
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label={`Подробнее: ${item.title}`}
        className="bg-surface group relative block aspect-[3/4] w-full overflow-hidden"
      >
        <Image
          src={item.image.src}
          alt=""
          fill
          loading="lazy"
          unoptimized={item.image.unoptimized}
          sizes="(max-width: 767px) 50vw, (max-width: 1699px) 33vw, 540px"
          // multiply: белый фон предметной съёмки сливается с тёплой
          // подложкой — карточки читаются одним тоном.
          className="object-cover mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        {item.category ? (
          <span className={badgeClass}>{item.category}</span>
        ) : null}
        {/* Подсказка на наведение (мышь). На телефоне кадр нажимают и так. */}
        <span className="bg-background/90 text-foreground pointer-events-none absolute inset-x-3 bottom-3 hidden translate-y-2 items-center justify-center rounded-[var(--radius-pill)] py-2.5 text-xs uppercase opacity-0 backdrop-blur-sm transition-[opacity,transform] duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 sm:flex">
          Подробнее
        </span>
      </button>

      <div className="flex flex-1 flex-col pt-3 sm:pt-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          <h3 className="heading-upper text-foreground text-sm leading-snug font-semibold sm:text-base">
            {item.title}
          </h3>
          {item.price ? <Price price={item.price} /> : null}
        </div>

        {item.size || note ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            {item.size ? (
              <span className="border-foreground/15 text-muted rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-[0.6875rem] sm:text-xs">
                Размер {item.size}
              </span>
            ) : null}
            {note ? (
              <span className="text-gray text-[0.6875rem] sm:text-xs">
                {note}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* mt-auto: кнопки выровнены по низу ряда, даже если у соседей
            название в две строки. Instagram — тихой ссылкой ПОД бронью:
            главное действие одно, на шесть карточек не двенадцать кнопок. */}
        <div className="mt-auto flex flex-col pt-4">
          <a
            href={bookingHref(item)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Забронировать: ${item.title}`}
            className="btn-pill h-11 w-full px-3 text-xs font-medium sm:text-sm"
          >
            Забронировать
          </a>
          <a
            href={post}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${item.title} — пост в Instagram`}
            className="text-gray hover:text-foreground mt-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs transition-colors duration-200 ease-out"
          >
            <InstagramGlyph width={13} height={13} />
            Пост в Instagram
          </a>
        </div>
      </div>
    </article>
  );
}

/**
 * Быстрый просмотр вещи — боковая панель, как условия на странице
 * сертификата. Кадр крупно и целиком (contain, без обрезки), цена, размер,
 * главное из правил; кнопки закреплены внизу и видны без прокрутки.
 */
function QuickView({
  item,
  onClose,
}: {
  item: RentalItemView | null;
  onClose: () => void;
}) {
  const price = item?.price ? splitPrice(item.price) : null;
  return (
    <Modal
      open={item !== null}
      onClose={onClose}
      title={item?.title ?? ""}
      placement="side"
      bare
    >
      {item ? (
        <div className="flex min-h-full flex-col">
          {/* Кадр — скруглённой карточкой с тенью на тёплой подложке, как
              витрина первого экрана и карточка сертификата. Фон предметной
              съёмки у вещей разный (белый, серый, бежевый): в рамке это
              выглядит задуманным, а не пятном на подложке. */}
          <div className="bg-surface flex h-[52svh] w-full shrink-0 items-center justify-center p-6 sm:h-[58svh] sm:p-8">
            <div className="relative aspect-[3/4] h-full max-w-full overflow-hidden rounded-[12px] bg-white shadow-[0_28px_55px_-22px_rgba(0,0,0,0.4)]">
              <Image
                src={item.image.src}
                alt={item.title}
                fill
                unoptimized={item.image.unoptimized}
                sizes="(max-width: 639px) 80vw, 24rem"
                className="object-cover"
              />
              {item.category ? (
                <span className={badgeClass}>{item.category}</span>
              ) : null}
            </div>
          </div>

          <div className="flex-1 px-6 pt-6 pb-8 sm:px-10 sm:pt-8">
            <h2 className="heading-upper text-foreground text-2xl leading-tight font-bold sm:text-3xl">
              {item.title}
            </h2>
            {item.price ? (
              <p className="text-foreground mt-3">
                <Price price={item.price} size="lg" />
                {price?.note ? (
                  <span className="text-gray mt-1 block text-sm">
                    {price.note}
                  </span>
                ) : null}
              </p>
            ) : null}
            {item.size ? (
              <p className="mt-4">
                <span className="border-foreground/15 text-muted rounded-[var(--radius-pill)] border px-3 py-1 text-sm">
                  Размер {item.size}
                </span>
              </p>
            ) : null}

            <ul className="border-foreground/10 mt-7 border-t">
              {RENT_FACTS.map((f) => (
                <li
                  key={f.value}
                  className="border-foreground/10 flex items-baseline gap-4 border-b py-3"
                >
                  <span className="heading-upper text-foreground w-14 shrink-0 text-sm font-semibold">
                    {f.value}
                  </span>
                  <span className="text-muted text-sm">{f.label}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray mt-5 text-sm leading-relaxed">
              «Забронировать» откроет Telegram с названием вещи — останется
              дописать дату и время получения и возврата.
            </p>
          </div>

          <div className="bg-background border-foreground/10 sticky bottom-0 flex flex-col gap-2 border-t px-6 py-4 sm:flex-row sm:px-10">
            <a
              href={bookingHref(item)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-solid h-12 px-6 text-sm font-medium sm:flex-1"
            >
              Забронировать в Telegram
            </a>
            <a
              href={item.instagramUrl ?? RENT_INSTAGRAM.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${item.title} — открыть пост в Instagram`}
              className="btn-pill h-12 px-6 text-sm font-medium"
            >
              <InstagramGlyph width={16} height={16} />
              Instagram
            </a>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

/**
 * Каталог аренды: фильтр по категориям + сетка карточек + быстрый просмотр.
 *
 * Фильтр прилипает под шапкой — переключать категории можно, не
 * возвращаясь наверх. Он появляется, только когда категорий хотя бы две:
 * одна кнопка над сеткой из одних платьев — шум. Порядок кнопок — как в
 * RENTAL_CATEGORIES, у каждой — сколько в ней вещей.
 */
export function RentCatalog({ items }: { items: RentalItemView[] }) {
  const [filter, setFilter] = useState<string>(ALL);
  const [active, setActive] = useState<RentalItemView | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) {
      if (i.category) m.set(i.category, (m.get(i.category) ?? 0) + 1);
    }
    return m;
  }, [items]);
  const categories = RENTAL_CATEGORIES.filter((c) => counts.has(c));

  const visible =
    filter === ALL ? items : items.filter((i) => i.category === filter);

  if (items.length === 0) {
    return (
      <div className="bg-surface mt-8 flex flex-col items-center px-6 py-16 text-center sm:mt-12 sm:py-24">
        <p className="heading-upper text-foreground text-xl font-bold sm:text-2xl">
          Каталог обновляется
        </p>
        <p className="text-muted mt-3 max-w-md text-base leading-relaxed">
          Пока все вещи — в Instagram проката. Выберите там и напишите нам в
          Telegram, чтобы забронировать.
        </p>
        <a
          href={RENT_INSTAGRAM.href}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-solid mt-8 h-12 px-8 text-sm font-medium"
        >
          <InstagramGlyph width={18} height={18} />
          {RENT_INSTAGRAM.handle}
        </a>
      </div>
    );
  }

  return (
    <>
      {categories.length >= 2 ? (
        // Полоса фильтра: на всю ширину контейнера (минус его поля), под
        // шапкой (top = высота шапки: 56px / 80px с sm).
        <div className="bg-background/90 border-foreground/10 sticky top-14 z-30 -mx-5 mt-6 border-b px-5 py-3 backdrop-blur-md sm:top-20 sm:-mx-8 sm:mt-8 sm:px-8 lg:-mx-12 lg:px-12">
          <div className="flex items-center gap-4">
            <div
              role="group"
              aria-label="Фильтр по категориям"
              // На телефоне чипы не влезают и листаются: правый край тает,
              // чтобы было видно, что дальше есть ещё.
              className="no-scrollbar -my-1 flex flex-1 gap-2 overflow-x-auto [mask-image:linear-gradient(to_right,black_85%,transparent)] py-1 sm:[mask-image:none]"
            >
              {[ALL, ...categories].map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={filter === c}
                  onClick={() => setFilter(c)}
                  className={chipClass}
                >
                  {c}
                  {/* Число — подсказка глазу; скринридеру его скажет строка
                      «N вещей» после выбора. */}
                  <span
                    aria-hidden="true"
                    className="text-[0.6875rem] opacity-50"
                  >
                    {c === ALL ? items.length : counts.get(c)}
                  </span>
                </button>
              ))}
            </div>
            {/* Видимый счётчик — только с sm: на телефоне он теснил чипы,
                а числа и так стоят на самих чипах. */}
            <p
              aria-hidden="true"
              className="text-gray hidden shrink-0 text-sm sm:block"
            >
              {itemsCount(visible.length)}
            </p>
          </div>
        </div>
      ) : (
        <p aria-hidden="true" className="text-gray mt-6 text-sm sm:mt-8">
          {itemsCount(visible.length)}
        </p>
      )}
      {/* Живая область для скринридера — одна на любой ширине и раскладке:
          после смены фильтра он услышит, сколько вещей осталось. */}
      <p className="sr-only" aria-live="polite" data-testid="rent-count">
        {itemsCount(visible.length)}
      </p>

      {/* key по фильтру — карточки заново проявляются при переключении:
          видно, что выборка сменилась, а не «ничего не произошло». */}
      <ul
        key={filter}
        className="mt-6 grid grid-cols-2 gap-x-3 gap-y-10 sm:mt-8 sm:gap-x-5 md:grid-cols-3 lg:gap-x-8 lg:gap-y-14"
      >
        {visible.map((item, i) => (
          <li
            key={item.id}
            className="animate-[rent-in_400ms_ease-out_both]"
            style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
          >
            <RentalCard item={item} onOpen={() => setActive(item)} />
          </li>
        ))}
      </ul>

      <QuickView item={active} onClose={() => setActive(null)} />
    </>
  );
}
