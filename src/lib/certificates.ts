import type { StaticImageData } from "next/image";
import sky from "@/assets/certificates/sky.jpg";
import powder from "@/assets/certificates/powder.jpg";
import sea from "@/assets/certificates/sea.jpg";
import forest from "@/assets/certificates/forest.jpg";
import graphite from "@/assets/certificates/graphite.jpg";

/**
 * Подарочные сертификаты: дизайны, номиналы, условия.
 *
 * Дизайны — готовые макеты (1536×1024, 3:2) с логотипом и надписью прямо на
 * кадре. Порядок — от светлого к тёмному: так ряд миниатюр читается ровно.
 */

export type CertificateDesign = {
  id: string;
  /** Короткое имя — в подписи и в сообщении менеджеру. */
  name: string;
  /** Что на кадре — для alt. */
  alt: string;
  /** Импорт картинки. В тестах (Vite) это строка-URL, в Next — объект. */
  image: StaticImageData | string;
};

export const CERTIFICATE_DESIGNS: readonly CertificateDesign[] = [
  {
    id: "sky",
    name: "Небо",
    alt: "Голубая рубашка и нить жемчуга",
    image: sky,
  },
  {
    id: "powder",
    name: "Пудра",
    alt: "Пудрово-розовая рубашка с перламутровой пуговицей",
    image: powder,
  },
  {
    id: "sea",
    name: "Море",
    alt: "Светлый камень у моря и оливковый шёлк",
    image: sea,
  },
  {
    id: "forest",
    name: "Лес",
    alt: "Кожаная сумка на мху в еловом лесу",
    image: forest,
  },
  {
    id: "graphite",
    name: "Графит",
    alt: "Графитовый трикотаж и кожаный ремень",
    image: graphite,
  },
] as const;

/** Готовые номиналы — по ценам услуг: от консультации до работы с гардеробом. */
export const CERTIFICATE_AMOUNTS = [5000, 10000, 15000, 25000, 35000] as const;
export const DEFAULT_AMOUNT = 10000;

/** Границы своей суммы. Те же числа — во втором пункте условий. */
export const MIN_AMOUNT = 500;
export const MAX_AMOUNT = 500000;

/**
 * «10 000». Разделитель — неразрывный пробел, собранный вручную, а не
 * Intl.NumberFormat: ICU в Node и в браузере ставят разные пробелы (U+00A0 /
 * U+202F), и серверная разметка разошлась бы с клиентской при гидратации.
 */
export function formatRub(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
}

export function isValidAmount(value: number | null): value is number {
  return (
    value !== null &&
    Number.isFinite(value) &&
    value >= MIN_AMOUNT &&
    value <= MAX_AMOUNT
  );
}

/** Текст, который уйдёт менеджеру: сумма и дизайн — чтобы не переспрашивать. */
export function certificateRequest(amount: number, design: CertificateDesign) {
  return `Здравствуйте! Хочу купить подарочный сертификат lina H. на ${formatRub(amount)} ₽, дизайн «${design.name}».`;
}

export const CERTIFICATE_MAIL_SUBJECT = "Подарочный сертификат lina H.";
