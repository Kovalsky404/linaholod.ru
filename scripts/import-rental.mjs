/**
 * Импорт вещей аренды из Instagram @holod.rent в Sanity (тип rentalItem).
 *
 * Instagram без входа посты не отдаёт, поэтому первые кадры сохраняются
 * вручную из профиля (через браузер владельца) в папку — файлы с именами
 * holod-rent-<код поста>.jpg. Данные карточек — из подписей к постам (ниже).
 *
 * Идемпотентен: _id фиксированные (rental-<код>), createOrReplace; Sanity
 * сам не дублирует одинаковые картинки (дедупликация по хешу файла).
 * Повторный запуск обновит карточки, правки из Studio при этом ПЕРЕЗАПИШУТСЯ —
 * после первого импорта редактируйте вещи в Studio, а не здесь.
 *
 * Запуск:
 *   node scripts/import-rental.mjs <папка с фото> --check   # пробный, без записи
 *   node scripts/import-rental.mjs <папка с фото>           # запись
 * Токен — как у seed.mjs: SANITY_API_WRITE_TOKEN или SANITY_API_READ_TOKEN (Editor).
 */
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createClient } from "@sanity/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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

/** Вещи — по подписям постов @holod.rent (порядок как в профиле). */
const ITEMS = [
  {
    code: "Dbobp3GEekW",
    title: "Портупея-подтяжки",
    category: "Аксессуары",
    size: "S/M",
    price: "500 ₽ / сутки",
  },
  {
    code: "Dboa4CVkVYG",
    title: "Ремень",
    category: "Аксессуары",
    size: "90–105 см",
    price: "600 ₽ / сутки",
  },
  {
    code: "DboaYeGkaV3",
    title: "Митенки",
    category: "Аксессуары",
    size: "One size",
    price: "300 ₽ / сутки",
  },
  {
    code: "DboZuskkYaK",
    title: "Жилет",
    category: "Верх",
    size: "M",
    price: "1 000 ₽ / сутки",
  },
  {
    code: "DboLQYojrYA",
    title: "Шорты",
    category: "Низ",
    size: "L",
    price: "1 000 ₽ / сутки",
  },
  {
    code: "DboKS8VDl-H",
    title: "Комплект: топ и юбка",
    category: "Костюмы",
    size: "M/L",
    price: "1 600 ₽ / сутки, по отдельности — 800 ₽",
  },
];

const [dirArg, ...flags] = process.argv.slice(2);
const check = flags.includes("--check");
if (!dirArg) {
  console.error("Укажите папку с фото: node scripts/import-rental.mjs <папка>");
  process.exit(1);
}
const dir = resolve(dirArg);
const fileOf = (code) => join(dir, `holod-rent-${code}.jpg`);

const missing = ITEMS.filter((i) => !existsSync(fileOf(i.code)));
if (missing.length > 0) {
  console.error("❌ Нет фото:", missing.map((i) => fileOf(i.code)).join(", "));
  process.exit(1);
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const token =
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN;
if (!projectId || !token) {
  console.error("❌ Нужны NEXT_PUBLIC_SANITY_PROJECT_ID и токен в .env.local");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-06-01",
  token,
  useCdn: false,
});

const doc = (item, i, assetId) => ({
  _id: `rental-${item.code}`,
  _type: "rentalItem",
  title: item.title,
  ...(assetId
    ? {
        image: {
          _type: "image",
          asset: { _type: "reference", _ref: assetId },
        },
      }
    : {}),
  instagramUrl: `https://www.instagram.com/holod.rent/p/${item.code}/`,
  category: item.category,
  size: item.size,
  price: item.price,
  order: i + 1,
});

if (check) {
  // Пробный прогон: Sanity проверяет права и мутацию, но ничего не пишет.
  const tx = client.transaction();
  ITEMS.forEach((item, i) => tx.createOrReplace(doc(item, i)));
  await tx.commit({ dryRun: true });
  console.log(
    `✓ Проверка пройдена: права на запись есть, ${ITEMS.length} вещей готовы к импорту.`,
  );
  process.exit(0);
}

const tx = client.transaction();
for (const [i, item] of ITEMS.entries()) {
  const asset = await client.assets.upload(
    "image",
    createReadStream(fileOf(item.code)),
    { filename: `holod-rent-${item.code}.jpg` },
  );
  console.log(`↑ ${item.title}: ${asset._id}`);
  tx.createOrReplace(doc(item, i, asset._id));
}
const res = await tx.commit();
console.log(`✓ Записано документов: ${res.results.length}`);
