/**
 * Seed-скрипт: заливает текущие плейсхолдеры (services / portfolio / reviews
 * + дефолтные siteSettings) в Sanity. Идемпотентен — повторный запуск обновляет
 * документы (фиксированные _id через createOrReplace), дублей не плодит.
 *
 * Изображения НЕ загружаются (реальных ассетов нет) — на сайте остаётся
 * плейсхолдер через fallback. Тексты/цены/структура заливаются.
 *
 * Запуск:  node scripts/seed.mjs
 * Требует в .env.local: NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET,
 * NEXT_PUBLIC_SANITY_API_VERSION и токен с правами записи:
 *   SANITY_API_WRITE_TOKEN (предпочтительно) либо SANITY_API_READ_TOKEN (если Editor).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@sanity/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// ── Лёгкий парсер .env.local (без зависимостей) ──
function loadEnv() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // .env.local может отсутствовать — переменные возьмём из окружения.
  }
}
loadEnv();

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-06-01";
const token =
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN;

if (!projectId) {
  console.error("❌ Нет NEXT_PUBLIC_SANITY_PROJECT_ID в .env.local");
  process.exit(1);
}
if (!token) {
  console.error(
    "❌ Нет токена записи. Добавьте SANITY_API_WRITE_TOKEN (роль Editor) в .env.local.",
  );
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
});

// ── Данные-плейсхолдеры (зеркало src/lib, чтобы скрипт был standalone) ──
const SERVICES = [
  {
    title: "Персональный шопинг",
    price: 20000,
    description:
      "Совместный поход по магазинам или онлайн-подбор: собираем гардероб под ваши цели, фигуру и бюджет.",
  },
  {
    title: "Консультация",
    price: 10000,
    description:
      "Индивидуальная встреча, где разбираем ваш стиль, типаж и задачи. Понятные ориентиры на выходе.",
  },
  {
    title: "Разбор гардероба",
    price: 15000,
    description:
      "Анализ содержимого гардероба: оставляем рабочие вещи, отсеиваем лишнее, фиксируем недостающее.",
  },
];

const PORTFOLIO = [
  {
    number: "#1",
    title: "Вечерний образ",
    shoot: "Editorial · Studio",
    description:
      "Капсула вечерних образов: чистый силуэт, благородные ткани, акцент на посадке.",
    date: "Март 2026",
  },
  {
    number: "#2",
    title: "Деловая капсула",
    shoot: "Lookbook · Office",
    description:
      "Гардероб для деловой среды: 12 вещей, которые собираются в десятки комплектов.",
    date: "Февраль 2026",
  },
  {
    number: "#3",
    title: "Повседневный стиль",
    shoot: "Street · Daylight",
    description:
      "Удобство без потери характера: трикотаж, деним, лаконичная обувь.",
    date: "Февраль 2026",
  },
  {
    number: "#4",
    title: "Образ для торжества",
    shoot: "Event · Soft light",
    description: "Подбор образа под конкретное событие и дресс-код.",
    date: "Январь 2026",
  },
];

const REVIEWS = [
  { author: "Анна М.", rating: 5, text: "Каждое утро одеваюсь за пять минут — всё сочетается." },
  { author: "Екатерина С.", rating: 5, text: "Ушла с чёткой картиной своего стиля и списком, что докупить." },
  { author: "Мария В.", rating: 5, text: "Персональный шопинг сэкономил недели метаний по магазинам." },
  { author: "Ольга Д.", rating: 4, text: "Думала, стилист — это дорого. Оказалось, это про уверенность." },
  { author: "Дарья К.", rating: 5, text: "Помогла увидеть мой собственный стиль и сделать его ярче." },
  { author: "Ирина П.", rating: 5, text: "Сборы перед встречами больше не стресс — беру готовый комплект." },
];

const SITE_SETTINGS = {
  _id: "siteSettings",
  _type: "siteSettings",
  telegram: "https://t.me/AHL2060",
  instagram: "https://www.instagram.com/_bulochka__s__makom_/",
  aboutText:
    "Помогаю выстроить гардероб, который работает на вас: от базы до акцентов. Без навязанных трендов — только ваш стиль.",
  whyMeTitle: "Почему я?",
  whyMeText:
    "Индивидуальный подход, честность и внимание к деталям. Работаю с вашим бюджетом и ритмом жизни, а не против них.",
  bookingIntro:
    "Оставьте контакт — отвечу лично и помогу выбрать формат работы. Без обязательств: сначала обсудим задачу.",
};

async function run() {
  console.log(`→ Проект ${projectId} / ${dataset}\n`);
  const tx = client.transaction();

  tx.createOrReplace(SITE_SETTINGS);

  SERVICES.forEach((s, i) =>
    tx.createOrReplace({
      _id: `service-${i + 1}`,
      _type: "service",
      title: s.title,
      price: s.price,
      priceCurrency: "RUB",
      description: s.description,
      order: i,
    }),
  );

  PORTFOLIO.forEach((p, i) =>
    tx.createOrReplace({
      _id: `portfolio-${i + 1}`,
      _type: "portfolioItem",
      number: p.number,
      title: p.title,
      shoot: p.shoot,
      description: p.description,
      date: p.date,
      order: i,
    }),
  );

  REVIEWS.forEach((r, i) =>
    tx.createOrReplace({
      _id: `review-${i + 1}`,
      _type: "review",
      author: r.author,
      text: r.text,
      rating: r.rating,
      order: i,
    }),
  );

  await tx.commit();
  console.log(
    `✓ Залито: 1 siteSettings, ${SERVICES.length} услуг, ${PORTFOLIO.length} работ, ${REVIEWS.length} отзывов`,
  );
  console.log(
    "\nДалее: откройте /studio, добавьте фото в услуги/работы/настройки и поправьте тексты.",
  );
}

run().catch((err) => {
  console.error("❌ Ошибка seed:", err.message || err);
  process.exit(1);
});
