import { Star } from "lucide-react";
import type { Review } from "@/lib/reviews";
import { Reveal } from "@/components/ui/Reveal";
import { AutoScroller } from "@/components/ui/AutoScroller";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** Чёрно-белые звёзды оценки: заполненные = rating, остальные — контур. */
function Stars({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`Оценка: ${rating} из 5`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={16}
          strokeWidth={1.5}
          aria-hidden="true"
          className={
            i < rating
              ? "fill-foreground text-foreground"
              : "text-foreground/25 fill-none"
          }
        />
      ))}
    </div>
  );
}

/**
 * Ширина карточки по длине отзыва.
 *
 * Длинный отзыв должен расти ВШИРЬ, а не вверх: иначе одна карточка
 * вытягивается вдвое выше соседей и ряд рассыпается. CSS сам «подобрать
 * ширину под высоту» не умеет — свойства «расти вширь, пока текст не уложится
 * в N строк» не существует, — поэтому ступени заданы явно.
 *
 * Значения выверены замером в браузере, а не прикинуты: зависимость линейная,
 * примерно 2.2px ширины на символ. Каждая ступень взята с запасом к
 * измеренному минимуму (355 знакам хватает 660px, ступень — 700), чтобы иной
 * шрифтовой рендеринг не выдавил лишнюю строку.
 *
 * Высота ряда 340, а не 300: при 300 самой длинной карточке требовалось 940px,
 * почти во весь экран. Сорок лишних пикселей высоты сокращают её до 660.
 *
 * На мобильном ступени не действуют (ширина ограничена экраном) — там длинный
 * отзыв по-прежнему растёт вниз, и это нормально: карточки листаются по одной,
 * соседняя рядом не стоит.
 */
function widthClass(length: number): string {
  if (length <= 100) return "sm:w-[300px]";
  if (length <= 170) return "sm:w-[380px]";
  if (length <= 240) return "sm:w-[480px]";
  if (length <= 330) return "sm:w-[640px]";
  return "sm:w-[700px]";
}

/**
 * Карточка отзыва: звёзды + цитата + автор. Без нумерации.
 *
 * Высота — МИНИМАЛЬНАЯ, а не фиксированная. Раньше стояла жёсткая h-[300px],
 * и отзыв длиннее пары строк вылезал за рамку карточки (замерено: текст на
 * 116px ниже её низа, поверх соседей). min-h держит общий ритм ряда, но
 * ничего не обрезает, если текст окажется длиннее всех ступеней ширины.
 */
function ReviewCard({ review }: { review: Review }) {
  return (
    <figure
      className={`${widthClass(review.text.length)} border-foreground/10 bg-background flex min-h-[220px] w-auto max-w-[290px] min-w-[230px] flex-none flex-col justify-between rounded-sm border p-5 sm:min-h-[340px] sm:max-w-none sm:min-w-0 sm:p-8`}
    >
      <div>
        <Stars rating={review.rating} />
        <blockquote className="text-muted mt-3 text-sm leading-relaxed sm:mt-4 sm:text-lg">
          {review.text}
        </blockquote>
      </div>

      <figcaption className="border-foreground/10 mt-4 border-t pt-3 sm:mt-6 sm:pt-4">
        <cite className="heading-upper text-foreground text-xs font-semibold not-italic sm:text-sm">
          {review.author}
        </cite>
      </figcaption>
    </figure>
  );
}

/**
 * Одна лента отзывов. Едет сама и прокручивается руками — обе силы двигают
 * scrollLeft, поэтому не конфликтуют (см. AutoScroller). На hover не
 * останавливается: пауза наступает только от реального действия
 * пользователя.
 *
 * Сюда передаётся ОДИН набор карточек. Сколько раз его продублировать для
 * бесшовной петли, решает AutoScroller: это зависит от ширины экрана, а не
 * от разметки.
 */
function ReviewsRow({
  items,
  direction,
  duration,
  label,
}: {
  items: readonly Review[];
  direction: "left" | "right";
  duration: number;
  label: string;
}) {
  return (
    <AutoScroller
      duration={duration}
      direction={direction}
      label={label}
      gapClass="gap-4 sm:gap-6"
    >
      {items.map((review) => (
        <ReviewCard key={review.author} review={review} />
      ))}
    </AutoScroller>
  );
}

/**
 * Секция «Отзывы» (id="reviews").
 *
 * Заголовок [ ОТЗЫВЫ ] — в контейнере 1700px, общая светлая стилистика сайта.
 * Ниже — две бесконечные ленты: верхняя едет вправо, нижняя влево (дорогое
 * статусное движение). Обе можно прокрутить самому — пальцем, колесом или с
 * клавиатуры. Цитаты — blockquote/cite, без нумерации.
 */
export function Reviews({ reviews }: { reviews: Review[] }) {
  const half = Math.ceil(reviews.length / 2);
  const rowTop = reviews.slice(0, half);
  const rowBottom = reviews.slice(half);

  return (
    <section
      id="reviews"
      className="scroll-mt-20 pb-8 sm:pb-14"
      aria-labelledby="reviews-heading"
    >
      {/* Заголовок — в контейнере. Отступ до разделителя уменьшен вдвое. */}
      <div className="container-site border-foreground/10 border-t pt-8 sm:pt-14">
        <Reveal>
          <SectionHeading id="reviews-heading">Отзывы</SectionHeading>
        </Reveal>
      </div>

      {/* Ленты — на всю ширину (full-bleed), вне контейнера.
          Большой вертикальный зазор между лентами, чтобы карточки не слипались. */}
      <Reveal
        delay={80}
        className="mt-8 flex flex-col gap-8 sm:gap-16 lg:mt-16"
      >
        <ReviewsRow
          items={rowTop}
          direction="right"
          duration={55}
          label="Отзывы клиентов, лента 1 — можно прокрутить"
        />
        <ReviewsRow
          items={rowBottom}
          direction="left"
          duration={65}
          label="Отзывы клиентов, лента 2 — можно прокрутить"
        />
      </Reveal>
    </section>
  );
}
