import { defineType, defineField } from "sanity";

/** Отзыв: автор, текст, оценка (1–5), порядок. */
export const review = defineType({
  name: "review",
  title: "Отзыв",
  type: "document",
  fields: [
    defineField({
      name: "author",
      title: "Автор",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "text",
      title: "Текст отзыва",
      type: "text",
      rows: 4,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "rating",
      title: "Оценка (1–5)",
      type: "number",
      initialValue: 5,
      validation: (rule) => rule.min(1).max(5).integer(),
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
    select: { title: "author", subtitle: "text" },
  },
});
