#!/usr/bin/env bash
# Деплой сайта на сервер: собрать и подменить рабочий каталог.
# Запуск на сервере:  bash /srv/projects/linaholod/repo/deploy/deploy.sh
set -euo pipefail

ROOT=/srv/projects/linaholod
REPO="$ROOT/repo"
CURRENT="$ROOT/current"
SERVICE=linaholod
PORT=3001

cd "$REPO"

echo "→ git pull"
git pull --ff-only

echo "→ npm ci"
npm ci

echo "→ next build (пик около 2 ГБ, на сервере 3.9 ГБ + 2 ГБ swap)"
npm run build

# ── Сборка рабочего каталога ────────────────────────────────────────────
# Собираем рядом и подменяем одним mv: сайт не лежит во время копирования.
NEW="$ROOT/current.new"
rm -rf "$NEW"
mkdir -p "$NEW"

echo "→ standalone"
# Точка в конце ОБЯЗАТЕЛЬНА: с `standalone/*` шелл пропустит скрытую папку
# .next, а в ней весь серверный код. Проверено — сайт молча остаётся без него.
cp -a .next/standalone/. "$NEW/"

echo "→ static и public"
# Их standalone НЕ включает. Без .next/static сайт будет без стилей и скриптов.
cp -a .next/static "$NEW/.next/static"
cp -a public "$NEW/public"

echo "→ sharp целиком"
# Трассировка Next выбрасывает нативные библиотеки libvips: пакет ужимается с
# ~19 МБ до ~0.4 МБ, sharp перестаёт грузиться, и оптимизатор МОЛЧА отдаёт
# неоптимизированные картинки — 259 КБ вместо 122 КБ на кадр (замерено).
# Поэтому кладём пакет из полного node_modules поверх обрезанного.
rm -rf "$NEW/node_modules/sharp" "$NEW/node_modules/@img"
cp -a node_modules/sharp "$NEW/node_modules/sharp"
cp -a node_modules/@img "$NEW/node_modules/@img"

# Кеш ISR и уже оптимизированных картинок переносим, чтобы после деплоя сайт
# не прогревался с нуля (первые открытия крупных фото заметно медленнее).
if [ -d "$CURRENT/.next/cache" ]; then
  echo "→ переношу кеш"
  cp -a "$CURRENT/.next/cache" "$NEW/.next/cache"
fi

echo "→ подмена каталога и рестарт"
rm -rf "$ROOT/current.old"
[ -d "$CURRENT" ] && mv "$CURRENT" "$ROOT/current.old"
mv "$NEW" "$CURRENT"
sudo systemctl restart "$SERVICE"
rm -rf "$ROOT/current.old"

# ── Проверка, что всё живо ──────────────────────────────────────────────
echo "→ проверка"
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://127.0.0.1:$PORT/" || true)
  [ "$code" = "200" ] && break
  sleep 1
done
[ "$code" = "200" ] || { echo "✗ сайт не отвечает (код $code). Логи: journalctl -u $SERVICE -n 50"; exit 1; }
echo "  главная: 200"

# Отдельно проверяем оптимизатор картинок: если sharp не подхватился, сайт
# откроется как ни в чём не бывало, но все фото поедут неоптимизированными.
# Адрес берём НАСТОЯЩИЙ, с самой главной: на SVG проверка молчала — Next их
# не оптимизирует, и рабочий оптимизатор выглядел как сломанный.
# Пробел и запятая в классе символов обязательны: первое совпадение на
# странице — это srcset целиком, десяток адресов через запятую (1472 символа).
# Без обрезки запрос уходил на такую склейку и возвращал 400.
img=$(curl -s --max-time 15 "http://127.0.0.1:$PORT/" \
  | grep -o '/_next/image?url=[^" ,]*' | head -1 | sed 's/&amp;/\&/g')
if [ -n "$img" ]; then
  ctype=$(curl -s -o /dev/null -w "%{content_type}" -H "Accept: image/avif,image/webp,*/*" \
    --max-time 90 "http://127.0.0.1:$PORT$img" || true)
  echo "  оптимизатор картинок: ${ctype:-нет ответа} (ожидается image/webp)"
  [ "$ctype" = "image/webp" ] || echo "    ВНИМАНИЕ: фото отдаются неоптимизированными — проверь sharp"
else
  echo "  оптимизатор картинок: на главной нет /_next/image — проверить вручную"
fi

echo "✓ Задеплоено: $(git rev-parse --short HEAD)"
