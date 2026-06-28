import { defineType, defineField } from "sanity";

/** Услуга: название, цена (текст — допускает «от…» и диапазоны), описание,
 *  изображение, порядок. */
export const service = defineType({
  name: "service",
  title: "Услуга",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Название",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "price",
      title: "Цена",
      type: "string",
      description:
        "Как показать на карточке: «от 15 000 ₽», «10 000 – 35 000 ₽». Цену в описание не дублируйте.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      title: "Описание",
      type: "text",
      rows: 8,
      description: "Без цены — она в поле выше.",
    }),
    defineField({
      name: "image",
      title: "Изображение",
      type: "image",
      options: { hotspot: true },
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
    select: { title: "title", subtitle: "price" },
  },
});
