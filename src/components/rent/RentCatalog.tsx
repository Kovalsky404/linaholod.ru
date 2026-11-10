"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { RentalItemView } from "@/sanity/types";
import { RENT_INSTAGRAM, telegramMessage } from "@/lib/site-config";
import { RENTAL_CATEGORIES, itemsCount, rentalRequest } from "@/lib/rent";
import { InstagramGlyph } from "@/components/ui/SocialIcon";

const ALL = "Все";

/** Чип фильтра: та же pill-геометрия, выбранный — залит. */
const chipClass =
  "border-foreground/15 text-foreground hover:border-foreground aria-pressed:bg-foreground aria-pressed:text-background aria-pressed:border-foreground inline-flex h-10 items-center rounded-[var(--radius-pill)] border px-4 text-sm whitespace-nowrap transition-colors duration-200 ease-out";

function RentalCard({ item }: { item: RentalItemView }) {
  const post = item.instagramUrl ?? RENT_INSTAGRAM.href;
  const meta = [item.size && `Размер ${item.size}`, item.price].filter(Boolean);
  return (
    <article className="flex h-full flex-col">
      {/* Кадр тоже ведёт на пост, но вне Tab и a11y-дерева: для клавиатуры и
          скринридера это дубль кнопки «Instagram» ниже. */}
      <a
        href={post}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={-1}
        aria-hidden="true"
        className="bg-surface group relative block aspect-[3/4] overflow-hidden"
      >
        <Image
          src={item.image.src}
          alt=""
          fill
          loading="lazy"
          unoptimized={item.image.unoptimized}
          sizes="(max-width: 767px) 50vw, (max-width: 1699px) 33vw, 540px"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      </a>

      <div className="flex flex-1 flex-col pt-3 sm:pt-4">
        {item.category ? (
          <p className="heading-upper text-gray text-[0.6875rem] font-normal sm:text-xs">
            {item.category}
          </p>
        ) : null}
        <h3 className="heading-upper text-foreground mt-1.5 text-sm leading-snug font-semibold sm:text-base">
          {item.title}
        </h3>
        {meta.length > 0 ? (
          <p className="text-muted mt-1.5 text-xs sm:text-sm">
            {meta.join(" · ")}
          </p>
        ) : null}

        {/* mt-auto: кнопки выровнены по низу ряда, даже если у соседей
            название в две строки. */}
        <div className="mt-auto flex flex-col gap-2 pt-4">
          <a
            href={telegramMessage(rentalRequest(item.title, item.instagramUrl))}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Забронировать: ${item.title}`}
            className="btn-solid h-11 w-full px-3 text-xs font-medium sm:text-sm"
          >
            Забронировать
          </a>
          <a
            href={post}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${item.title} — пост в Instagram`}
            className="btn-pill h-11 w-full px-3 text-xs font-medium sm:text-sm"
          >
            <InstagramGlyph width={16} height={16} />
            Instagram
          </a>
        </div>
      </div>
    </article>
  );
}

/**
 * Каталог аренды: фильтр по категориям + сетка карточек.
 *
 * Фильтр появляется, только когда категорий хотя бы две: одна кнопка
 * «Платья» над сеткой из одних платьев — шум. Порядок кнопок — как в
 * RENTAL_CATEGORIES, а не как попало в данных.
 */
export function RentCatalog({ items }: { items: RentalItemView[] }) {
  const [filter, setFilter] = useState<string>(ALL);

  const categories = useMemo(() => {
    const present = new Set(items.map((i) => i.category).filter(Boolean));
    return RENTAL_CATEGORIES.filter((c) => present.has(c));
  }, [items]);

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
        <div
          role="group"
          aria-label="Фильтр по категориям"
          className="no-scrollbar -mx-5 mt-8 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:mt-10 sm:flex-wrap sm:px-0"
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
            </button>
          ))}
        </div>
      ) : null}

      <p className="text-gray mt-6 text-sm" aria-live="polite">
        {itemsCount(visible.length)}
      </p>

      <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 lg:gap-x-8 lg:gap-y-14">
        {visible.map((item) => (
          <li key={item.id}>
            <RentalCard item={item} />
          </li>
        ))}
      </ul>
    </>
  );
}
