import { defineType, defineField } from "sanity";

/**
 * Работа портфолио: номер, название, съёмка, описание, дата, обложка,
 * галерея, порядок.
 *
 * coverImage — основное фото (обложка карточки на сайте).
 * gallery — остальные фото съёмки, листаются в быстром просмотре (модалке).
 *           Обложку сюда дублировать НЕ нужно — она показывается первой.
 */
export const portfolioItem = defineType({
  name: "portfolioItem",
  title: "Работа портфолио",
  type: "document",
  fields: [
    defineField({
      name: "number",
      title: "Номер (например #1)",
      type: "string",
    }),
    defineField({
      name: "title",
      title: "Название работы",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "shoot",
      title: "Название съёмки",
      type: "string",
    }),
    defineField({
      name: "description",
      title: "Описание",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "date",
      title: "Дата",
      type: "string",
      description: "Текстом, как нужно показать (например «Март 2026»).",
    }),
    defineField({
      name: "coverImage",
      title: "Основная фотография (обложка)",
      description:
        "Показывается на карточке в портфолио на сайте. В галерею ниже её добавлять не нужно.",
      type: "image",
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "gallery",
      title: "Галерея (быстрый просмотр)",
      description:
        "Остальные фото съёмки — листаются в окне быстрого просмотра. Без обложки.",
      type: "array",
      of: [{ type: "image", options: { hotspot: true } }],
    }),
    defineField({
      name: "order",
      title: "Порядок",
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
    select: { title: "title", subtitle: "shoot", media: "coverImage" },
  },
});
