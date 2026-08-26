# Деплой linaholod.ru на VPS

Сайт переезжает с Vercel: из РФ домен на Vercel режется по SNI (ТСПУ) и
недоступен российской аудитории. Российский хостинг снимает блокировку.

## Что за сервер (осмотрено, не предположения)

| | |
|---|---|
| `194.87.43.128`, Москва | Ubuntu 24.04.4 LTS |
| RAM | 3.9 ГБ + swap 2 ГБ |
| Диск | 48 ГБ, свободно 41 ГБ |
| Node | **v22.23.2** системный (`/usr/bin/node`), npm 10.9.8 |
| Прокси | **Caddy** — не nginx, nginx не установлен |
| Порт 3000 | занят соседним проектом `sw-tj` (тоже Next.js) |
| Наш порт | **3001** |
| cdn.sanity.io / api.sanity.io | отвечают за 0.08–0.11 с |
| github.com | отвечает за 0.29 с |

Node 22 подходит: `next@16` требует ≥20.9. Отдельный контейнер и разведение
версий через nvm не нужны — ставим вторую службу рядом.

Архитектура: `Пользователь → Caddy :80/:443 → node server.js :3001`.
Caddy сам получает и продлевает сертификаты Let's Encrypt; certbot не нужен.

## Почему standalone

`next.config.ts` собирает в режиме `output: "standalone"` — так же запускается
соседний проект. На сервере живёт **36 МБ** вместо 862 МБ, `node_modules` после
сборки не нужны. Ровно поэтому служба стартует `node server.js`, а не
`npm run start`.

---

## Текущее состояние (26.08.2026)

**Сайт уже развёрнут и работает** на `127.0.0.1:3001`. Осталось одно —
переключить DNS, шаг 5.

| | |
|---|---|
| Служба `linaholod` | active, автозапуск включён, 221 МБ |
| Рабочий каталог | `/srv/projects/linaholod/current`, 58 МБ |
| Главная / Studio | 200 |
| sitemap | содержит `https://linaholod.ru/` |
| Оптимизатор картинок | `image/webp`, 122 КБ вместо 259 КБ |
| Сосед `sw-tj` и Caddy | active, не задеты |
| Блок в Caddyfile | дописан, бэкап рядом (`Caddyfile.bak.*`) |
| Сертификат | **не выпущен** — DNS ещё указывает на Vercel |

Caddy повторяет попытки выпуска до 30 дней и получит сертификат сам, как
только домен переедет. До этого в `journalctl -u caddy` будут ошибки ACME —
это ожидаемо, а не поломка.

Замеры на сервере: пик сборки 2442 МБ из 3913, сайт в работе 86–221 МБ.

---

## Первый деплой

### 1. Каталоги
```bash
sudo mkdir -p /srv/projects/linaholod
sudo chown "$USER":"$USER" /srv/projects/linaholod
git clone https://github.com/Kovalsky404/linaholod.ru.git /srv/projects/linaholod/repo
```

### 2. Переменные окружения
```bash
cd /srv/projects/linaholod/repo
cp .env.example .env.local
nano .env.local
```
Заполнить как локально, но `NEXT_PUBLIC_SITE_URL=https://linaholod.ru`.

> `.env.local` нужен **только на время сборки**: все `NEXT_PUBLIC_*` вшиваются
> в бандл, а токен Sanity в рантайме не используется — сайт читает
> опубликованные данные без авторизации (см. `src/sanity/client.ts`).
> В рабочий каталог `current/` секреты не копируются.

### 3. Сборка и запуск
```bash
bash /srv/projects/linaholod/repo/deploy/deploy.sh
```
Скрипт соберёт проект, разложит рабочий каталог в `current/`, перезапустит
службу и проверит, что сайт отвечает.

Перед первым запуском поставить службу:
```bash
sudo cp /srv/projects/linaholod/repo/deploy/systemd/linaholod.service \
        /etc/systemd/system/linaholod.service
sudo systemctl daemon-reload
sudo systemctl enable --now linaholod
systemctl status linaholod          # active (running)
curl -I http://127.0.0.1:3001       # 200
```

### 4. Caddy
Дописать блок в конец `/etc/caddy/Caddyfile` — **ничего не удаляя**, соседний
сайт остаётся как есть:
```bash
sudo tee -a /etc/caddy/Caddyfile < /srv/projects/linaholod/repo/deploy/caddy/linaholod.ru.caddy
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

### 5. DNS на reg.ru
В зоне `linaholod.ru`:
- `@` — запись **A** → `194.87.43.128` (удалить старую A на Vercel)
- `www` — запись **A** → `194.87.43.128` (удалить CNAME на Vercel)
- TTL 300, дождаться обновления: `nslookup linaholod.ru`

Сертификат Caddy выпустит сам при первом обращении к домену — но только
после того, как DNS уже указывает сюда.

### 6. Проверка
```bash
curl -I https://linaholod.ru          # 200
curl -I https://www.linaholod.ru      # 308 → https://linaholod.ru
```
Открыть с телефона **без VPN** — ради этого всё и затевалось.

### 7. Vercel
Когда домен заработает — убрать кастомные домены в Vercel. Проект можно
оставить как резерв на `*.vercel.app`.

---

## Обновление сайта
```bash
bash /srv/projects/linaholod/repo/deploy/deploy.sh
```
Каталог подменяется одним `mv`, поэтому сайт не лежит во время копирования.

## Если что-то не так

```bash
journalctl -u linaholod -f      # логи сайта
journalctl -u caddy -f          # логи прокси
systemctl status linaholod
```

**Сайт открылся, но без стилей** — не скопировался `.next/static`. Смотреть
шаг «static и public» в `deploy.sh`.

**Фотографии грузятся, но тяжёлые** — не подхватился sharp. Проверка в конце
деплоя печатает `оптимизатор картинок:`; там должно быть `image/webp`, а не
`image/jpeg`. Причина известна: трассировка Next выбрасывает нативные
библиотеки libvips, поэтому `deploy.sh` кладёт пакет `sharp` поверх обрезанного.
Проверить руками:
```bash
cd /srv/projects/linaholod/current && node -e "console.log(require('sharp').versions)"
```

**Сборка упала по памяти** — swap 2 ГБ уже есть, но если сосед в этот момент
под нагрузкой, можно собрать с ограничением:
`NODE_OPTIONS=--max-old-space-size=2048 npm run build`.

## Заметки
- `sharp` приходит зависимостью `next@16` (`npm ls sharp` → `sharp@0.34.5`),
  linux-бинарники есть в `package-lock.json` — `npm ci` поставит нужный сам.
- Оптимизация картинок грузит CPU на первом обращении к каждому размеру,
  дальше результат лежит в `.next/cache`. Исходники крупные (hero до 3200px),
  поэтому первые открытия после деплоя заметно медленнее. `deploy.sh`
  переносит кеш между версиями, чтобы не прогревать заново.
- ISR (`revalidate = 60`) пишет кеш на диск — на одном сервере работает без
  настройки.
