import { defineType, defineField } from "sanity";

/**
 * Настройки сайта (singleton) — соцсети, контакты и тексты секций,
 * которые задаются один раз: hero, «Обо мне», «Почему я?», приглашение формы.
 */
export const siteSettings = defineType({
  name: "siteSettings",
  title: "Настройки сайта",
  type: "document",
  groups: [
    { name: "social", title: "Соцсети и контакты" },
    { name: "hero", title: "Hero" },
    { name: "about", title: "Обо мне" },
    { name: "whyMe", title: "Почему я" },
    { name: "services", title: "Услуги" },
    { name: "booking", title: "Запись" },
  ],
  fields: [
    // Соцсети / контакты
    defineField({
      name: "telegram",
      title: "Telegram (ссылка)",
      type: "url",
      group: "social",
    }),
    defineField({
      name: "instagram",
      title: "Instagram (ссылка)",
      type: "url",
      group: "social",
    }),
    defineField({
      name: "whatsapp",
      title: "WhatsApp (ссылка)",
      type: "url",
      group: "social",
    }),
    defineField({
      name: "phone",
      title: "Телефон",
      type: "string",
      group: "social",
    }),
    defineField({
      name: "email",
      title: "E-mail",
      type: "string",
      group: "social",
    }),

    // Hero
    defineField({
      name: "heroImage",
      title: "Изображение Hero",
      type: "image",
      options: { hotspot: true },
      group: "hero",
    }),

    // Обо мне
    defineField({
      name: "aboutTitle",
      title: "Заголовок «Обо мне»",
      type: "string",
      group: "about",
    }),
    defineField({
      name: "aboutText",
      title: "Текст «Обо мне»",
      type: "text",
      rows: 4,
      group: "about",
    }),

    // Почему я
    defineField({
      name: "whyMeTitle",
      title: "Заголовок «Почему я»",
      type: "string",
      group: "whyMe",
    }),
    defineField({
      name: "whyMeText",
      title: "Текст «Почему я»",
      type: "text",
      rows: 4,
      group: "whyMe",
    }),
    defineField({
      name: "whyMeImage",
      title: "Изображение «Почему я»",
      type: "image",
      options: { hotspot: true },
      group: "whyMe",
    }),

    // Услуги
    defineField({
      name: "servicesTerms",
      title: "Дополнительные условия (мелкий текст под услугами)",
      description: "Каждый пункт с новой строки.",
      type: "text",
      rows: 5,
      group: "services",
    }),

    // Запись
    defineField({
      name: "bookingIntro",
      title: "Приглашение в форме записи",
      type: "text",
      rows: 3,
      group: "booking",
    }),
  ],
  preview: {
    prepare: () => ({ title: "Настройки сайта" }),
  },
});
