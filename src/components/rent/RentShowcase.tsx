import Image from "next/image";
import type { RentalItemView } from "@/sanity/types";

/** Положение карточки в веере: центр крупнее и впереди, края — с наклоном. */
const SLOTS = [
  "z-0 w-[34%] -mr-[7%] translate-y-[6%] -rotate-[7deg] group-hover:-rotate-[9deg] group-hover:-translate-x-[4%]",
  "z-10 w-[40%]",
  "z-0 w-[34%] -ml-[7%] translate-y-[6%] rotate-[7deg] group-hover:rotate-[9deg] group-hover:translate-x-[4%]",
] as const;

/**
 * Витрина первого экрана: три вещи из каталога веером на тёплой подложке —
 * тот же приём, что у карточки на странице сертификата (скруглённый кадр с
 * мягкой тенью). При наведении веер чуть раскрывается.
 *
 * Декоративная: смысл несёт заголовок рядом, а сами вещи ниже — в каталоге.
 * Поэтому alt пустые и блок скрыт от скринридера.
 */
export function RentShowcase({ items }: { items: RentalItemView[] }) {
  // Одна-две вещи — без пустых мест в веере: берём центральные позиции.
  const slots =
    items.length >= 3
      ? SLOTS
      : items.length === 2
        ? ([SLOTS[0], SLOTS[1]] as const)
        : ([SLOTS[1]] as const);

  return (
    <div
      aria-hidden="true"
      className="bg-surface group flex items-center justify-center overflow-hidden px-6 py-12 sm:px-12 sm:py-16 lg:min-h-[34rem]"
    >
      <div className="flex w-full max-w-[25rem] items-center justify-center sm:max-w-[34rem] xl:max-w-[44rem]">
        {items.slice(0, 3).map((item, i) => (
          <div
            key={item.id}
            className={`relative aspect-[3/4] shrink-0 overflow-hidden rounded-[10px] bg-white shadow-[0_28px_55px_-22px_rgba(0,0,0,0.4)] transition-transform duration-500 ease-out sm:rounded-[14px] ${slots[i]}`}
          >
            <Image
              src={item.image.src}
              alt=""
              fill
              // Центральная — главный кадр первого экрана.
              preload={i === 1 || items.length === 1}
              unoptimized={item.image.unoptimized}
              sizes="(max-width: 1023px) 40vw, 300px"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
