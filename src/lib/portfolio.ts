/**
 * Работы для секции «Портфолио» (карусель + детальная модалка).
 * У каждой работы — несколько фотографий (съёмка из 10–12 кадров).
 * TODO: заменить плейсхолдеры реальными работами и фото от клиента.
 */

export type PortfolioItem = {
  id: string;
  /** Номер работы для подписи (#1, #2 …). */
  number: string;
  title: string;
  /** Название съёмки. */
  shoot: string;
  description: string;
  /** Дата работы (отображается как есть). */
  date: string;
  /** Фотографии работы (листаются стрелками в модалке). Минимум одна. */
  images: readonly string[];
};

const PLACEHOLDER = "/images/placeholder.svg";

/** Пока все фото — один плейсхолдер; задаём количество кадров на работу. */
const shots = (count: number): readonly string[] =>
  Array.from({ length: count }, () => PLACEHOLDER);

export const PORTFOLIO: readonly PortfolioItem[] = [
  {
    id: "evening-elegance",
    number: "#1",
    title: "Вечерний образ",
    shoot: "Editorial · Studio",
    // TODO: реальное описание работы
    description:
      "Капсула вечерних образов: чистый силуэт, благородные ткани, акцент на посадке. Подбор от базы до аксессуаров.",
    date: "Март 2026",
    images: shots(12),
  },
  {
    id: "business-capsule",
    number: "#2",
    title: "Деловая капсула",
    shoot: "Lookbook · Office",
    // TODO: реальное описание работы
    description:
      "Гардероб для деловой среды: 12 вещей, которые собираются в десятки комплектов. Спокойная палитра, выверенные пропорции.",
    date: "Февраль 2026",
    images: shots(10),
  },
  {
    id: "street-style",
    number: "#3",
    title: "Повседневный стиль",
    shoot: "Street · Daylight",
    // TODO: реальное описание работы
    description:
      "Удобство без потери характера: трикотаж, деним, лаконичная обувь. Образы для города, которые работают каждый день.",
    date: "Февраль 2026",
    images: shots(8),
  },
  {
    id: "wedding-guest",
    number: "#4",
    title: "Образ для торжества",
    shoot: "Event · Soft light",
    // TODO: реальное описание работы
    description:
      "Подбор образа под конкретное событие и дресс-код. Цвет, фактура и аксессуары собраны в цельный, запоминающийся силуэт.",
    date: "Январь 2026",
    images: shots(11),
  },
  {
    id: "wardrobe-detox",
    number: "#5",
    title: "Разбор гардероба",
    shoot: "Process · Home",
    // TODO: реальное описание работы
    description:
      "До/после разбора: оставляем рабочие вещи, фиксируем недостающее. Гардероб становится понятным и сочетаемым.",
    date: "Январь 2026",
    images: shots(9),
  },
  {
    id: "seasonal-update",
    number: "#6",
    title: "Сезонное обновление",
    shoot: "Editorial · Outdoor",
    // TODO: реальное описание работы
    description:
      "Точечное обновление гардероба к сезону: несколько ключевых вещей, которые освежают весь набор образов.",
    date: "Декабрь 2025",
    images: shots(10),
  },
  {
    id: "color-analysis",
    number: "#7",
    title: "Цветотип и палитра",
    shoot: "Studio · Portrait",
    // TODO: реальное описание работы
    description:
      "Определение цветотипа и подбор индивидуальной палитры. Цвета, которые подсвечивают, а не спорят с внешностью.",
    date: "Декабрь 2025",
    images: shots(12),
  },
  {
    id: "capsule-travel",
    number: "#8",
    title: "Капсула для поездки",
    shoot: "Lookbook · Travel",
    // TODO: реальное описание работы
    description:
      "Компактный набор вещей для путешествия: минимум багажа, максимум комбинаций. Всё продумано под маршрут и погоду.",
    date: "Ноябрь 2025",
    images: shots(11),
  },
] as const;
