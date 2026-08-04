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
    { name: "certificates", title: "Сертификаты" },
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
    // Поле whatsapp удалено: WhatsApp убран с сайта целиком. Ранее
    // сохранённое значение остаётся в датасете — оно просто больше не
    // читается и не редактируется, так что возврат обратим.
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
    defineField({
      name: "aboutGallery",
      title: "Фотографии «Обо мне» (ровно 5)",
      description:
        "Порядок задаётся перетаскиванием. 1 — маленькая слева сверху, " +
        "2 — вторая маленькая слева, 3 — большая в центре, 4 и 5 — маленькие " +
        "справа снизу. Незаполненные слоты покажут серую заглушку. " +
        "Коллаж рассчитан ровно на 5 кадров: шестой не отобразится.",
      type: "array",
      of: [{ type: "image", options: { hotspot: true } }],
      // max(5), а не min(5): полупустой набор — рабочее промежуточное
      // состояние при заполнении, а вот шестой кадр показать негде.
      validation: (Rule) => Rule.max(5),
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

    // Сертификаты
    defineField({
      name: "certificatesImage",
      title: "Фото для окна «Сертификаты»",
      description:
        "Вертикальный кадр в пропорции 4:5 (например 1600×2000). Другие " +
        "пропорции не сломают вёрстку — кадр обрежется по центру, но края " +
        "могут уйти. Пока фото не залито, показывается серая заглушка.",
      type: "image",
      options: { hotspot: true },
      group: "certificates",
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
