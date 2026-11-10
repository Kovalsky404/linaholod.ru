import { defineType, defineField } from "sanity";

/**
 * Настройки сайта (singleton) — соцсети, контакты и тексты секций,
 * которые задаются один раз: hero, «Обо мне», «Почему я?», приглашение,
 * тексты страницы аренды.
 *
 * Поле certificatesImage удалено вместе с окном сертификатов: теперь это
 * отдельная страница с готовыми дизайнами. Сохранённое значение (если было)
 * остаётся в датасете и просто не читается.
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
    { name: "rent", title: "Аренда одежды" },
    { name: "booking", title: "Запись" },
  ],
  fields: [
    // Соцсети / контакты
    defineField({
      name: "telegram",
      title: "Telegram — рабочий чат (ссылка)",
      description:
        "Чат, куда пишут клиенты. Сейчас идёт только в разметку для " +
        "поисковиков; кнопки «Записаться» ведут в чат, заданный в коде сайта.",
      type: "url",
      group: "social",
    }),
    defineField({
      name: "telegramChannel",
      title: "Telegram-канал (ссылка)",
      description:
        "Иконка Telegram в подвале сайта ведёт сюда. Пусто — используется " +
        "канал по умолчанию (t.me/asitwas_bylina).",
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
      description:
        "Почта для кнопки «По почте» на странице сертификатов. Пусто — " +
        "используется адрес по умолчанию из кода сайта (info@linaholod.ru).",
      type: "string",
      validation: (Rule) => Rule.email(),
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

    // Аренда одежды (страница /rent). Сами вещи — отдельный тип
    // «Аренда — вещи» в меню слева.
    defineField({
      name: "rentIntro",
      title: "Аренда: вступительный текст",
      description:
        "Абзац под заголовком страницы. Абзацы разделяются пустой строкой. " +
        "Пусто — показывается текст по умолчанию.",
      type: "text",
      rows: 4,
      group: "rent",
    }),
    defineField({
      name: "rentTerms",
      title: "Аренда: условия",
      description:
        "Тёмный блок «Условия аренды». Каждый пункт с новой строки. Пусто — " +
        "показываются общие условия по умолчанию.",
      type: "text",
      rows: 6,
      group: "rent",
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
