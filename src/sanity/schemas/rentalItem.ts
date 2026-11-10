import { defineType, defineField } from "sanity";
import { RENTAL_CATEGORIES } from "@/lib/rent";

/**
 * Вещь в аренде — карточка каталога на странице /rent.
 *
 * Сами вещи живут в Instagram проката (@holod.rent). На сайте — их первый
 * кадр, название и ссылка на пост: «Забронировать» открывает Telegram с уже
 * набранным названием, «Instagram» — сам пост.
 */
export const rentalItem = defineType({
  name: "rentalItem",
  title: "Вещь в аренде",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Название",
      description:
        "Коротко и понятно, например «Шёлковое платье-комбинация». Это " +
        "название подставится в сообщение менеджеру при бронировании.",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "image",
      title: "Фото (первый кадр поста)",
      description:
        "Вертикальный кадр 3:4, как в сетке Instagram. Другую пропорцию сайт " +
        "обрежет по центру — точку, которая должна остаться в кадре, можно " +
        "задать кнопкой «hotspot».",
      type: "image",
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "instagramUrl",
      title: "Ссылка на пост в Instagram",
      description: "Кнопка «Instagram» на карточке ведёт сюда.",
      type: "url",
      validation: (rule) =>
        rule
          .uri({ scheme: ["https"] })
          .custom((url) =>
            !url || /^https:\/\/(www\.)?instagram\.com\//.test(url)
              ? true
              : "Нужна ссылка на instagram.com",
          ),
    }),
    defineField({
      name: "category",
      title: "Категория",
      description:
        "Необязательно. Когда категорий в каталоге две и больше, над сеткой " +
        "появляется фильтр.",
      type: "string",
      options: { list: [...RENTAL_CATEGORIES] },
    }),
    defineField({
      name: "size",
      title: "Размер",
      description: "Необязательно. Например «S–M» или «38».",
      type: "string",
    }),
    defineField({
      name: "price",
      title: "Стоимость",
      description: "Необязательно. Текстом, как показать: «2 500 ₽ / сутки».",
      type: "string",
    }),
    defineField({
      name: "order",
      title: "Порядок",
      description: "Меньше — выше в каталоге.",
      type: "number",
      initialValue: 0,
    }),
  ],
  orderings: [
    {
      title: "По порядку",
      name: "orderAsc",
      by: [{ field: "order", direction: "asc" }],
    },
  ],
  preview: {
    select: { title: "title", subtitle: "price", media: "image" },
  },
});
