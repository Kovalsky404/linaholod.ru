# CONTEXT-HANDOVER

Документ для передачи работы на другую машину / другому агенту без истории.
Все пути — относительно корня проекта. Значения секретов НЕ приводятся, только имена.

Последнее обновление: репозиторий на коммите `0a932c6` (ветка `main`), рабочее дерево чистое.

---

## 1. Что за проект

Одностраничный лендинг персонального стилиста (**Лина Холод**, бренд «lina H.», домен `linaholod.ru`). Аудитория — Россия, язык русский. Форма собирает заявки и шлёт их в Telegram.

### Стек
- **Next.js 16.2.7** (App Router, Turbopack) + **React 19.2.4** + **TypeScript** (strict, `noUncheckedIndexedAccess`).
- **Tailwind CSS v4** (`@theme`, токены в `src/app/globals.css`).
- **Sanity CMS v5** (встроенная Studio на `/studio`, `next-sanity`), с фолбэком на статические данные из `src/lib`.
- Хостинг: **Vercel** (деплой из GitHub). ⚠️ см. раздел 4 — домен блокируется в РФ.
- Тесты: **Vitest + React Testing Library + jsdom** (юнит/интеграция), **Playwright** (E2E).

### ВАЖНО перед правкой кода
`AGENTS.md` (в корне, подключён через `CLAUDE.md`) требует: **это НЕ тот Next.js, что в обучающих данных** — читай `node_modules/next/dist/docs/` перед написанием кода Next. Реально пригождается для API-конвенций App Router / self-hosting.

### Структура (ключевое)
```
src/app/
  layout.tsx                      корневой layout (<html lang=ru>, шрифт Inter)
  (site)/
    layout.tsx                    «хром» сайта: Header + main + Footer, строит JSON-LD, revalidate=60
    page.tsx                      главная: Promise.all 4 Sanity-геттеров → пропсы в 7 секций
    privacy/page.tsx              Политика обработки ПД (152-ФЗ), robots: noindex
    consent/page.tsx              Согласие на обработку ПД (отдельный документ, ст.9 152-ФЗ)
  api/lead/route.ts               POST-обработчик заявки → Telegram Bot API
  studio/[[...tool]]/page.tsx     встроенная Sanity Studio (force-dynamic)
src/components/
  sections/                       Hero, About, Portfolio, Services, WhyMe, Reviews, Booking
  layout/                         Header, Footer
  ui/                             Modal, Select, SectionHeading, Reveal, SocialIcon
src/lib/                          lead.ts, telegram.ts, seo.ts, site-config.ts,
                                  services.ts, portfolio.ts, reviews.ts  (последние 3 — фолбэк-данные)
src/sanity/                       content.ts (мапперы+фолбэки), fetch.ts, image.ts, client.ts,
                                  env.ts, queries.ts, types.ts, schemas/
src/hooks/useReveal.ts           IntersectionObserver-анимация появления
sanity.config.ts                 (корень) конфиг Studio, basePath /studio
test/                            setup.ts (jsdom-глобалы), smoke.test.ts
e2e/                             Playwright-спеки (*.spec.ts, *.mobile.spec.ts)
deploy/                          runbook переноса на российский VPS (см. раздел 4/6)
vitest.config.ts  playwright.config.ts  next.config.ts
```

### Запуск локально
```bash
npm install
npx playwright install chromium          # один раз, для E2E
# создать .env.local (см. раздел 7), затем:
npm run dev                              # next dev на :3000 (порт 3000 бывает занят — тогда: npm run dev -- -p 3210)
# http://localhost:3000  и Studio на  http://localhost:3000/studio
npm run build                            # прод-сборка
npm test                                 # vitest (юнит + интеграция), пул vmThreads
npm run e2e                              # playwright (поднимет next dev на :3210 сам)
npm run lint                             # eslint
```
Требуется **Node 20+** (разрабатывалось на Node 24.16, npm 11.13). Google Fonts (Inter) тянется на сборке — нужен доступ к `fonts.googleapis.com`.

---

## 2. Текущее состояние

### Работает и покрыто тестами
Функционально сайт собран целиком: Hero, «Обо мне», Портфолио (карусель + модалка быстрого просмотра с видео-первым слайдом), Услуги (с модалкой), «Почему я?», Отзывы (marquee), форма записи → Telegram, SEO (метаданные, OG, sitemap, robots, JSON-LD, 404), правовые страницы, интеграция Sanity + Studio.

**Тесты (всё зелёное):** `229 passed | 2 todo` в vitest + `9 passed` в Playwright.

| Область | Файлы тестов |
|---|---|
| Lead API (route) | `src/app/api/lead/route.test.ts` |
| Валидация lead | `src/lib/lead.test.ts` |
| Telegram-хелперы | `src/lib/telegram.test.ts` |
| Sanity content+фолбэки | `src/sanity/content.test.ts` |
| SEO/JSON-LD | `src/lib/seo.test.ts` |
| Форма записи (RTL) | `src/components/sections/Booking.test.tsx` |
| Быстрый просмотр (RTL) | `src/components/sections/Portfolio.test.tsx` |
| Шапка/меню (RTL) | `src/components/layout/Header.test.tsx` |
| Сборка главной | `src/app/(site)/page.test.tsx` |
| Правовые страницы + ссылки согласия | `src/app/(site)/privacy/page.test.tsx`, `.../consent/page.test.tsx`, `src/components/sections/Booking.consent-links.test.tsx` |
| Layout: JSON-LD sameAs + Footer | `src/app/(site)/layout.test.tsx`, `src/components/layout/Footer.test.tsx` |
| E2E | `e2e/lead.spec.ts`, `e2e/navigation.spec.ts`, `e2e/menu.mobile.spec.ts` |

Каждая тест-фича проходила независимое ревью с мутационным тестированием; найденные false-negative закрывались.

### Сделано частично / с оговорками
- **Правовые документы** (`privacy/page.tsx`, `consent/page.tsx`) — написаны по 152-ФЗ, но с **незаполненными плейсхолдерами** `[ФИО полностью]`, `[ИНН]`, `[e-mail для обращений]`, `[дата публикации]`. Точные формулировки в тестах НЕ пинуются (2 `todo`-теста) — это зона юриста.
- **Контент Sanity** — на сайте плейсхолдеры (`/images/placeholder.svg`) для Hero/портфолио/услуг/«Почему я», пока владелец не зальёт реальные фото и тексты в Studio. Часть текстов услуг/«Обо мне»/«Почему я» уже залита скриптом (см. `scripts/apply-client-edits.mjs`).
- **Мультиполучатель Telegram** — код готов (`TELEGRAM_CHAT_ID` принимает несколько ID через запятую), но второй получатель ещё должен нажать `/start` боту, и переменная в Vercel обновляется вручную.

### Не начато
- **CI** — GitHub Actions нет. Тесты гоняются только вручную.
- **Перенос на российский хостинг** — руководство написано (`deploy/`), но НЕ выполнено. Это главный открытый пункт (см. разделы 4 и 6).
- **Аналитика/реклама** — сознательно отсутствуют (нет Метрики, cookies-трекеров, таргета).

---

## 3. Над чем работали в сессии, породившей F1–F10 (по шагам)

Эта серия коммитов (`add9283`..`c586587`) — покрытие бизнес-логики тестами по циклу «обсуждение → тесты → независимое ревью → правки → коммит». Плюс до неё в той же сессии: адаптив-правки под мобайл, диагностика блокировки домена, фича «видео в быстром просмотре», мультиполучатель Telegram, `deploy/`-runbook.

**Тестовый конвейер (что создавали/меняли и зачем):**
1. **Тулинг** — `vitest.config.ts`, `test/setup.ts`, `test/smoke.test.ts`, скрипты `test`/`test:watch`/`e2e` в `package.json`. Пул `vmThreads` (см. раздел 5).
2. **F1** `src/app/api/lead/route.test.ts` — интеграция обработчика. Заодно **вынесены** `escapeHtml`/`formatContact` из `route.ts` в новый `src/lib/telegram.ts` (route-файл не должен иметь лишних экспортов; и чтобы юнит-тестировать ветки).
3. **F2** `src/lib/lead.test.ts` — чистые `validateLead`/`normalizeLead`.
4. **F3** `src/lib/telegram.test.ts` — `escapeHtml`/`formatContact`.
5. **F4** `src/sanity/content.test.ts` — мапперы + фолбэки. **Экспортированы** `parsePrice`/`slugify` из `content.ts` для прямых тестов.
6. **F5** `src/lib/seo.test.ts` — `buildJsonLd`.
7. **F6** `src/components/sections/Booking.test.tsx` — форма (RTL). Здесь же в коммит вошло предсуществовавшее незакоммиченное изменение `src/components/sections/Booking.tsx` (см. раздел 4).
8. **F7** `src/components/sections/Portfolio.test.tsx` — быстрый просмотр (RTL).
9. **F8** `src/components/layout/Header.test.tsx` + добавлен `data-scrolled` в `Header.tsx` (честный сигнал состояния скролла вместо чтения инертного CSS-класса).
10. **F9–F10** `e2e/*.spec.ts` + `playwright.config.ts` — E2E. Установлены `@playwright/test` + chromium.

**F11–F13** (`f3d400d`, `a5b883d`, `0a932c6`) — добавлены **другой сессией (Claude Sonnet 5)**, не этой: тесты `page.tsx`, правовых страниц/ссылок согласия и `layout.tsx`+`Footer`. Они в репозитории и зелёные; их проектные решения см. в сообщениях этих коммитов.

---

## 4. Незакрытые хвосты (баги, костыли, TODO)

### Критичное (не код — но блокирует запуск для РФ-аудитории)
- **Домен `linaholod.ru` не открывается из России.** Диагностировано инструментами: DNS корректный, TLS-сертификат Vercel выпущен и сайт отдаёт 200 из-за рубежа, но из РФ соединение по SNI обрывается (фильтрация ТСПУ). Общие `*.vercel.app` работают. **Это не баг кода** — в Vercel/коде не лечится. Временно доступен `linaholod-ru.vercel.app`. Решение — перенос на российский хостинг (`deploy/README.md`).
- **152-ФЗ ст.18 ч.5 (локализация ПД в РФ) не выполнена.** Первичный сбор ПД идёт на зарубежной инфраструктуре (Vercel). Тот же перенос на RF-хостинг закрывает и это.
- **Юридические плейсхолдеры не заполнены** — `src/app/(site)/privacy/page.tsx` (строки ~46, 49–50, 31 — `[ФИО полностью]`, `[ИНН]`, `[e-mail для обращений]`, `[дата публикации]`) и `src/app/(site)/consent/page.tsx` (строки ~37–38, 73 — те же). До заполнения документы неполные.
- **Регистрационные действия владельца (вне кода):** оформить самозанятость/ИП, подать уведомление в Роскомнадзор об обработке ПД. Без этого приём заявок — в серой зоне.

### Код: намеренно замороженные «смелы» (задокументированы в тестах, НЕ править без владельца)
- `src/lib/telegram.ts` (`formatContact`): любое слово из 4–32 букв в поле контакта превращается в ссылку `t.me/...` — включая обычные имена («John» → ссылка). Заморожено тестами в `src/lib/telegram.test.ts` (тесты 38–40).
- `src/sanity/content.ts` (`parsePrice`): разделитель обрывает число на первой группе (`"10.000"` → `10`); `NaN` проходит как есть. Заморожено в `src/sanity/content.test.ts`.
- `src/lib/seo.ts` (`buildJsonLd`): `price` эмитится **числом**, тогда как schema.org каноничен со строкой — потенциальная неконформность rich-results. Текущее поведение пришпилено с пометкой в `src/lib/seo.test.ts` (тест 2).

### Код: поведение, которое стоит перепроверить
- `src/components/sections/Booking.tsx:122` — успех отправки решается **`if (json.ok)`**, HTTP-статус (`res.ok`) игнорируется. Это было незакоммиченное WIP-изменение (раньше `if (res.ok && json.ok)`), вошедшее в коммит F6. Тесты (`Booking.test.tsx` 14/14b, `e2e/lead.spec.ts`) фиксируют именно это. Роут держит статус и `json.ok` согласованными, так что на практике ок; но если это было случайно — откат одной строкой (и тогда поправить тест 14b).

### Инфраструктура тестов
- **Флак Vitest «failed to find the runner»** на ОДИНОЧНОМ холодном прогоне файла в Vitest 4.1.10. Смягчён пулом `vmThreads` (в `vitest.config.ts`). Полный `npm test` стабилен; одиночные прогоны свежих файлов изредка требуют повторного запуска. Причина — баг Vitest 4.1, не тестов.
- **2 `todo`-теста** (в правовых спеках) — заглушки: точные юридические формулировки не пинуются намеренно, ждут финальной редакции юристом.

### Прочее
- `next.config.ts`: `images.remotePatterns` разрешает только `cdn.sanity.io/images/**`. Видео в портфолио отдаётся нативным `<video>` (не через `next/image`), поэтому под remotePatterns не подпадает — это ок, но помни при добавлении новых источников картинок.
- Порт 3000 на машине разработки бывает занят другим проектом — использовать `npm run dev -- -p 3210` (E2E-конфиг и так использует 3210).

---

## 5. Принятые решения (и почему; особенно отказ от очевидного)

- **Route-группа `(site)`** изолирует хром (Header/Footer) от `/studio`. Иначе Studio унаследовала бы шапку/подвал сайта.
- **Фолбэк-архитектура контента:** `src/sanity/fetch.ts::sanityFetch` возвращает `null` при ошибке/неконфигурированности → мапперы в `content.ts` подставляют статические данные из `src/lib`. Сайт рендерится и с пустой CMS, и с заполненной. `getSiteSettings` при `null` возвращает **`null`** (компоненты берут свои дефолты), а НЕ фолбэк-объект — это осознанно.
- **Vitest без `@vitejs/plugin-react`.** Очевидный путь (ставить плагин) НЕ сработал: `@vitejs/plugin-react@6` тянет конфликт `@babel/core@8`. Решение — JSX через esbuild (`esbuild: { jsx: "automatic" }` в `vitest.config.ts`), плагин не нужен.
- **Пул `vmThreads`** (не дефолтный `forks`, не `threads`). `forks`/`threads` в Vitest 4.1 периодически роняют прогон «failed to find the runner»; `vmThreads` стабилен на этом тулчейне.
- **`test/setup.ts` c guard по `window`.** jsdom-глобалы (`matchMedia`, `scrollIntoView`, `IntersectionObserver`) ставятся только `if (typeof window !== "undefined")`, потому что setup общий для ВСЕХ спеков, включая node-окружение (`route`/`lib`/`content`/`seo` идут с докблоком `// @vitest-environment node`).
- **Мокаем только швы, реальную логику — нет.** В `content.test.ts` мокаются лишь `@/sanity/fetch` и `@/sanity/image`; `@sanity/image-url` URL-грамматику НЕ тестируем (это вендор, не наш код). `server-only` заглушается `vi.mock`.
- **Экстракции ради тестируемости:** `escapeHtml`/`formatContact` → `src/lib/telegram.ts`; экспорт `parsePrice`/`slugify` из `content.ts`; `data-scrolled` в `Header.tsx`. Поведение при этом не менялось.
- **E2E перехватывает `/api/lead`** через `page.route` (Playwright). Осознанно: реальный обработчик покрыт vitest-ом, а E2E НЕ должен слать в реальный Telegram. `beforeEach` ставит safety-дефолт-перехват в каждом submit-тесте.
- **Тесты ключаются на роли/лейблы/текст, не на классы.** В jsdom CSS инертен (`css:false`), классы ничего не доказывают; состояние доказывается через `aria-expanded`/`aria-hidden`/`role`/видимый текст.
- **Аналитики и cookies-баннера нет намеренно** — чтобы не тянуть требования по cookies-согласию и упростить комплаенс на старте.

---

## 6. Что делать дальше (конкретный следующий шаг)

**Приоритет №1 — перенос на российский хостинг.** Это снимает блокировку домена И закрывает 152-ФЗ ст.18 ч.5 одним действием. Руководство готово: **`deploy/README.md`** (VPS Ubuntu → `next build`+`next start` за nginx + Let's Encrypt, systemd-юнит, deploy-скрипт). Владелец выбрал провайдера **Timeweb Cloud**.

Конкретно по шагам (из `deploy/README.md`):
1. Арендовать VPS (Timeweb Cloud, Ubuntu 24.04, 1–2 vCPU / 2 ГБ).
2. Node 20+, nginx, certbot, склонировать репозиторий, положить `.env.local`, `npm ci && npm run build`.
3. `deploy/systemd/linaholod.service` → автозапуск; `deploy/nginx/linaholod.ru.conf` → reverse-proxy на :3000; certbot выпускает сертификат.
4. На reg.ru перевести A-записи `@` и `www` с Vercel на IP сервера.
5. Проверить `https://linaholod.ru` без VPN.

**Параллельно (можно раньше):**
- Заполнить юр-плейсхолдеры в `privacy/page.tsx` и `consent/page.tsx` (ФИО/ИНН/e-mail/дата), финализировать текст у юриста.
- Залить реальные фото/видео и тексты в Sanity Studio (`/studio`).
- Владельцу: оформить самозанятость, подать уведомление в РКН.

**Опционально:** добавить GitHub Actions workflow, гоняющий `npm test` и `npm run e2e` на push (сейчас CI нет).

---

## 7. Окружение

### `.env.local` (НЕ в git; создать по `.env.example`) — только имена
- `NEXT_PUBLIC_SITE_URL` — базовый URL (напр. прод-домен). Используется в `src/lib/seo.ts` (обрезает хвостовой слэш; фолбэк `http://localhost:3000`).
- `TELEGRAM_BOT_TOKEN` — токен бота от @BotFather.
- `TELEGRAM_CHAT_ID` — куда шлёт заявки. **Можно несколько ID через запятую** (`111,222`); каждый получатель должен сперва написать боту `/start`.
- `NEXT_PUBLIC_SANITY_PROJECT_ID` — id проекта Sanity (значение известно владельцу; было `n69pvjdg`).
- `NEXT_PUBLIC_SANITY_DATASET` — датасет (`production`).
- `NEXT_PUBLIC_SANITY_API_VERSION` — версия API (напр. `2026-06-01`).
- `SANITY_API_READ_TOKEN` — токен чтения Sanity (роль Editor, если нужны write-скрипты). Скрипты в `scripts/` также принимают `SANITY_API_WRITE_TOKEN`.

На **Vercel** те же переменные заданы в настройках проекта; изменение переменной применяется только после нового деплоя.

### Прочие незакоммиченные файлы (в `.gitignore`)
- `.env*` (кроме `.env.example`), `.mcp.json` (содержит Figma-токен для MCP), `figma-assets/`, `_client/`.
- Playwright-артефакты: `test-results/`, `playwright-report/`, `playwright/.cache/`.

### Зависимости, которые нужно поставить на чистой машине
```bash
npm install                       # все зависимости из package.json
npx playwright install chromium   # браузер для E2E (headless shell ~114 МБ)
```
Ключевые версии (из `package.json`): `next@16.2.7`, `react@19.2.4`, `sanity@^5.30`, `next-sanity@^13`, `tailwindcss@^4`, `vitest@latest (4.1.x)`, `@testing-library/react@^16`, `@playwright/test@^1.61`. TypeScript strict.

### Мелочи окружения
- Разработка шла на Windows (PowerShell + Git Bash), Node 24.16, npm 11.13. `git push` в GitHub из РФ периодически подвисает (троттлинг) — иногда нужно несколько попыток.
- Sanity Studio доступна на `/studio` (встроенная, `force-dynamic`).
- Скрипты записи в Sanity: `scripts/seed.mjs`, `scripts/apply-client-edits.mjs` — ⚠️ `apply-client-edits.mjs` УДАЛЯЕТ все документы `service` и создаёт заново; запускать осознанно.
