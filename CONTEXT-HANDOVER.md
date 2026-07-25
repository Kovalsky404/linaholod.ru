# CONTEXT-HANDOVER

Документ для передачи работы на другую машину / другому агенту без истории.
Все пути — относительно корня проекта. Значения секретов НЕ приводятся, только имена.

Последнее обновление: репозиторий на коммите `f2b8bb9` (ветка `main`), рабочее дерево чистое.

> **Главное изменение последней сессии:** с сайта **полностью удалён сбор персональных данных** — нет формы заявки, нет эндпоинта `/api/lead`, нет страниц политики и согласия. Все кнопки «Записаться» ведут прямо в Telegram-чат. Причина — сознательный выход из-под требований 152-ФЗ. Подробности — разделы 3 и 5.

---

## 1. Что за проект

Одностраничный лендинг персонального стилиста (**Лина Холод**, бренд «lina H.», домен `linaholod.ru`). Аудитория — Россия, язык русский. **Заявок сайт не принимает**: все CTA ведут в Telegram-чат `https://t.me/holod_styling`.

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
  studio/[[...tool]]/page.tsx     встроенная Sanity Studio (force-dynamic)
                                  ⚠️ API-маршрутов в проекте НЕТ (каталога src/app/api не существует)
src/components/
  sections/                       Hero, About, Portfolio, Services, WhyMe, Reviews, Booking
  layout/                         Header, Footer
  ui/                             Modal, SectionHeading, Reveal, SocialIcon
src/lib/                          seo.ts, site-config.ts,
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

### Где живёт ссылка на Telegram
Единый источник — `src/lib/site-config.ts`, константа `CTA`:
```ts
export const CTA = { label: "Записаться", href: "https://t.me/holod_styling", external: true } as const;
```
Используется в 6 местах, везде с `target="_blank" rel="noopener noreferrer"`:
`layout/Header.tsx` (десктоп + мобильное меню), `layout/Footer.tsx`, `sections/Portfolio.tsx` (шапка секции, под каруселью, модалка), `sections/Booking.tsx` (кнопка секции). Менять URL — только в `site-config.ts`.

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
Сайт собран целиком: Hero, «Обо мне», Портфолио (карусель + модалка быстрого просмотра с видео-первым слайдом), Услуги (с модалкой), «Почему я?», Отзывы (marquee), секция «Записаться» (приглашение + шаги + кнопка в Telegram), SEO (метаданные, OG, sitemap, robots, JSON-LD, 404), интеграция Sanity + Studio.

**Тесты (всё зелёное):** `97 passed` в vitest (9 файлов) + `6 passed` в Playwright.

| Область | Файлы тестов |
|---|---|
| Sanity content + фолбэки | `src/sanity/content.test.ts` |
| SEO / JSON-LD | `src/lib/seo.test.ts` |
| Секция «Записаться» (RTL) | `src/components/sections/Booking.test.tsx` |
| Быстрый просмотр портфолио (RTL) | `src/components/sections/Portfolio.test.tsx` |
| Шапка / мобильное меню (RTL) | `src/components/layout/Header.test.tsx` |
| Футер: мердж соцсетей + CTA | `src/components/layout/Footer.test.tsx` |
| Сборка главной | `src/app/(site)/page.test.tsx` |
| Layout: JSON-LD sameAs | `src/app/(site)/layout.test.tsx` |
| Смоук рантайма | `test/smoke.test.ts` |
| E2E | `e2e/navigation.spec.ts`, `e2e/menu.mobile.spec.ts` |

Тесты писались по циклу «обсуждение с саб-агентом → тесты → независимое ревью с мутационным тестированием → правки»; найденные false-negative закрывались.

> Раньше было ~229 тестов. ~100 из них покрывали форму заявки, `/api/lead`, `lead.ts`, `telegram.ts` и правовые страницы — удалены **вместе с проверяемым кодом** (см. раздел 3). Это не потеря покрытия: проверять стало нечего.

### Сделано частично / с оговорками
- **Контент Sanity** — на сайте плейсхолдеры (`/images/placeholder.svg`) для Hero/портфолио/услуг/«Почему я», пока владелец не зальёт реальные фото и тексты в Studio. Часть текстов услуг/«Обо мне»/«Почему я» уже залита скриптом (`scripts/apply-client-edits.mjs`).
- **Описания работ портфолио** — в сессии готовились заголовки/подзаголовки/описания для нескольких съёмок (формат: ЗАГОЛОВОК / `EN • CAPS • BULLET` подзаголовок / описание / дата). Часть уже внесена в Studio, часть — нет. Уточнить у владельца, какие съёмки остались.

### Не начато
- **CI** — GitHub Actions нет. Тесты гоняются только вручную.
- **Перенос на российский хостинг** — руководство написано (`deploy/`), но НЕ выполнено. Главный открытый пункт (разделы 4 и 6).
- **Аналитика/реклама** — сознательно отсутствуют (нет Метрики, cookies-трекеров, таргета).

---

## 3. Над чем работали в последней сессии (по шагам)

### 3.1. Покрытие тестами (коммиты `add9283`..`c586587`)
Тестовый конвейер: тулинг (`vitest.config.ts`, `test/setup.ts`, скрипты `test`/`e2e`), затем по фиче — юнит/интеграция/RTL/E2E. Ради тестируемости в код внесены **поведенчески-нейтральные** правки: экспорт `parsePrice`/`slugify` из `src/sanity/content.ts`; атрибут `data-scrolled` в `src/components/layout/Header.tsx` (честный сигнал состояния скролла вместо чтения инертного CSS-класса). Установлены `@playwright/test` + chromium.

### 3.2. Удаление сбора персональных данных (коммиты `c31cdcd`, `f2b8bb9`)
**Зачем:** владелец решил не попадать под 152-ФЗ — проще вообще не собирать ПД на сайте, чем выполнять обязанности оператора (политика, согласие, уведомление РКН, локализация данных в РФ).

**Коммит `c31cdcd` — убрана форма, CTA переведены на Telegram:**
- `src/lib/site-config.ts` — `CTA.href` с якоря `#book` на `https://t.me/holod_styling` (+ флаг `external`).
- `src/components/sections/Booking.tsx` — **переписан**: была клиентская форма (поля, кастомный select, чекбокс согласия, submit → `/api/lead`), стал **server-компонент** без состояния: приглашение + 3 шага + соцсети + кнопка в Telegram. Секция и якорь `#book` сохранены.
- `Header.tsx`, `Footer.tsx`, `Portfolio.tsx` — всем CTA добавлены `target="_blank"` + `rel="noopener noreferrer"`.
- `Footer.tsx` — удалён блок правовых ссылок (и неиспользуемый импорт `next/link`).
- Удалены: `src/app/(site)/privacy/`, `src/app/(site)/consent/`, `src/components/ui/Select.tsx` (использовался только формой).
- `src/app/(site)/page.tsx` — больше не прокидывает `services` в `Booking`.
- Тесты: удалены спеки формы/согласия/правовых страниц и `e2e/lead.spec.ts`; написан новый `Booking.test.tsx` (кнопка ведёт в Telegram, формы НЕТ); обновлены `Header.test.tsx`, `page.test.tsx`, `Footer.test.tsx`, `e2e/navigation.spec.ts`.

**Коммит `f2b8bb9` — удалён серверный приёмник:**
- Удалён `src/app/api/lead/` (обработчик + тесты) — **каталог `src/app/api` исчез целиком**, в прод-сборке API-маршрутов не осталось.
- Удалены `src/lib/lead.ts` (валидация заявки) и `src/lib/telegram.ts` (экранирование/форматирование контакта) вместе с тестами — импортировались только этим маршрутом.
- Из `.env.example` убраны `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`.

Проверено после каждого шага: `tsc`, `eslint`, `npm test`, `npm run e2e`, `next build`. Независимое ревью саб-агентом по итогу `c31cdcd`: вердикт «ship as-is» (мутация `CTA.href` → `#book` краснит 3 теста, значит тесты рабочие).

### 3.3. Прочее в той же сессии
Адаптив-правки под мобайл, диагностика блокировки домена, фича «видео первым слайдом в быстром просмотре» (поле `video` в схеме `portfolioItem`, отдаётся нативным `<video>`), `deploy/`-runbook.

---

## 4. Незакрытые хвосты (баги, костыли, TODO)

### Критичное
- **Домен `linaholod.ru` не открывается из России.** Диагностировано инструментами: DNS корректный, TLS-сертификат Vercel выпущен и сайт отдаёт 200 из-за рубежа, но из РФ соединение по SNI обрывается (фильтрация ТСПУ). Общие `*.vercel.app` при этом работают. **Это не баг кода** — в Vercel/коде не лечится. Временно доступен `linaholod-ru.vercel.app`. Решение — перенос на российский хостинг (`deploy/README.md`).
  ⚠️ Раньше у переноса было два мотива (доступность + локализация ПД по 152-ФЗ ст.18 ч.5). **Второй мотив отпал** — сайт не собирает ПД. Остаётся только доступность, но она блокирующая: для РФ-аудитории домен нерабочий.

### Юридический статус (вне кода, у владельца)
- Оформить самозанятость/ИП для приёма оплат за услуги.
- Уведомление в Роскомнадзор об обработке ПД **больше не требуется по сайту** (сайт данных не собирает). Общение и данные клиентов в Telegram — отдельная история вне периметра проекта. Это не юридическая консультация.

### Код: намеренно замороженные «смелы» (задокументированы в тестах, НЕ править без владельца)
- `src/sanity/content.ts` (`parsePrice`): разделитель обрывает число на первой группе (`"10.000"` → `10`); `NaN` проходит как есть. Заморожено в `src/sanity/content.test.ts`.
- `src/lib/seo.ts` (`buildJsonLd`): `price` эмитится **числом**, тогда как schema.org каноничен со строкой — потенциальная неконформность rich-results. Текущее поведение пришпилено с пометкой в `src/lib/seo.test.ts` (тест 2).
- `src/sanity/content.ts` (`slugify`): буква `ё` вне диапазона `а-я` → становится разделителем (`"Ёлка"` → `"лка"`). Заморожено там же.

### Инфраструктура тестов
- **Флак Vitest «failed to find the runner»** на ОДИНОЧНОМ холодном прогоне файла в Vitest 4.1.10. Смягчён пулом `vmThreads` (в `vitest.config.ts`). Полный `npm test` стабилен; одиночные прогоны свежих файлов изредка требуют повторного запуска. Причина — баг Vitest 4.1, не тестов.

### Прочее
- `next build` печатает предупреждение `metadataBase property in metadata export is not set` — относится к страницам вне `(site)`-layout (Studio / 404); в `(site)/layout.tsx:17` `metadataBase` задан. Предупреждение предсуществующее, на OG главной не влияет. Если будет мешать — задать `metadataBase` в корневом `layout.tsx`.
- `next.config.ts`: `images.remotePatterns` разрешает только `cdn.sanity.io/images/**`. Видео портфолио отдаётся нативным `<video>` (не через `next/image`), под remotePatterns не подпадает — это ок, но помни при добавлении новых источников картинок.
- Порт 3000 на машине разработки бывает занят другим проектом — использовать `npm run dev -- -p 3210` (E2E-конфиг и так использует 3210).

---

## 5. Принятые решения (и почему; особенно отказ от очевидного)

### Продуктовые / юридические
- **Никакого сбора ПД на сайте — вместо комплаенса.** Очевидный путь (оставить форму и выполнить 152-ФЗ: политика, согласие, уведомление РКН, локализация БД в РФ) отвергнут как дорогой и рискованный для одного стилиста. Выбрано радикально простое: **нет формы → нет ПД → нет обязанностей оператора**. Поэтому удалены и форма, и `/api/lead`, и правовые страницы.
- **Удалён и серверный эндпоинт, не только форма.** Убрать кнопку мало: обработчик оставался достижимым по URL и технически принимал ПД (плюс риск спама в Telegram). «Задняя дверь» закрыта вместе с фасадом.
- **Секция «Записаться» сохранена** (якорь `#book`, пункт меню «Контакты», шаги записи) — это конверсионный блок, просто теперь ведёт в Telegram. Ломать навигацию/якоря не стали.
- **Единственный источник ссылки — `CTA` в `site-config.ts`.** Никаких хардкод-URL в разметке, чтобы смена контакта была однострочной.
- **Аналитики и cookies-баннера нет намеренно** — чтобы не тянуть требования по cookies-согласию.

### Архитектурные
- **Route-группа `(site)`** изолирует хром (Header/Footer) от `/studio`. Иначе Studio унаследовала бы шапку/подвал сайта.
- **Фолбэк-архитектура контента:** `src/sanity/fetch.ts::sanityFetch` возвращает `null` при ошибке/неконфигурированности → мапперы в `content.ts` подставляют статические данные из `src/lib`. Сайт рендерится и с пустой CMS, и с заполненной. `getSiteSettings` при `null` возвращает **`null`** (компоненты берут свои дефолты), а НЕ фолбэк-объект — это осознанно.
- **`Booking` — server-компонент.** После удаления формы состояние не нужно; директива `"use client"` снята намеренно (меньше JS на клиенте).

### Тестовые
- **Vitest без `@vitejs/plugin-react`.** Очевидный путь (поставить плагин) НЕ сработал: `@vitejs/plugin-react@6` тянет конфликт `@babel/core@8`. Решение — JSX через esbuild (`esbuild: { jsx: "automatic" }` в `vitest.config.ts`).
- **Пул `vmThreads`** (не дефолтный `forks`, не `threads`). `forks`/`threads` в Vitest 4.1 периодически роняют прогон «failed to find the runner»; `vmThreads` стабилен на этом тулчейне.
- **`test/setup.ts` c guard по `window`.** jsdom-глобалы (`matchMedia`, `scrollIntoView`, `IntersectionObserver`) ставятся только `if (typeof window !== "undefined")`, потому что setup общий для ВСЕХ спеков, включая node-окружение (`content`/`seo` идут с докблоком `// @vitest-environment node`).
- **Мокаем только швы, реальную логику — нет.** В `content.test.ts` мокаются лишь `@/sanity/fetch` и `@/sanity/image`; URL-грамматику `@sanity/image-url` НЕ тестируем (это вендор). `server-only` заглушается `vi.mock`.
- **Тесты ключаются на роли/лейблы/текст, не на классы.** В jsdom CSS инертен (`css: false`), классы ничего не доказывают; состояние доказывается через `aria-expanded`/`aria-hidden`/`role`/видимый текст.
- **CTA проверяются по назначению, а не по факту существования.** Тесты пинуют точный `href` (Telegram-URL) + `target` + `rel`; отдельно есть проверка, что в секции `#book` НЕТ `textbox`/`checkbox` — это страж от случайного возврата формы.

---

## 6. Что делать дальше (конкретный следующий шаг)

**Приоритет №1 — перенос на российский хостинг.** Единственная причина теперь — доступность домена из РФ (мотив с локализацией ПД отпал). Руководство готово: **`deploy/README.md`** (VPS Ubuntu → `next build` + `next start` за nginx + Let's Encrypt, systemd-юнит, deploy-скрипт). Владелец выбрал провайдера **Timeweb Cloud**.

Конкретно по шагам (из `deploy/README.md`):
1. Арендовать VPS (Timeweb Cloud, Ubuntu 24.04, 1–2 vCPU / 2 ГБ).
2. Node 20+, nginx, certbot; склонировать репозиторий, положить `.env.local`, `npm ci && npm run build`.
3. `deploy/systemd/linaholod.service` → автозапуск; `deploy/nginx/linaholod.ru.conf` → reverse-proxy на :3000; certbot выпускает сертификат.
4. На reg.ru перевести A-записи `@` и `www` с Vercel на IP сервера.
5. Проверить `https://linaholod.ru` без VPN.

**Параллельно (можно раньше):**
- Залить реальные фото/видео и тексты в Sanity Studio (`/studio`) — сейчас плейсхолдеры.
- Довнести описания оставшихся съёмок портфолио (формат см. раздел 2).
- Владельцу: оформить самозанятость.

**Опционально:** GitHub Actions workflow, гоняющий `npm test` и `npm run e2e` на push (сейчас CI нет).

---

## 7. Окружение

### `.env.local` (НЕ в git; создать по `.env.example`) — только имена
- `NEXT_PUBLIC_SITE_URL` — базовый URL (напр. прод-домен). Используется в `src/lib/seo.ts` (обрезает хвостовой слэш; фолбэк `http://localhost:3000`).
- `NEXT_PUBLIC_SANITY_PROJECT_ID` — id проекта Sanity (значение известно владельцу; было `n69pvjdg`).
- `NEXT_PUBLIC_SANITY_DATASET` — датасет (`production`).
- `NEXT_PUBLIC_SANITY_API_VERSION` — версия API (напр. `2026-06-01`).
- `SANITY_API_READ_TOKEN` — токен чтения Sanity (роль Editor, если нужны write-скрипты). Скрипты в `scripts/` также принимают `SANITY_API_WRITE_TOKEN`.

> `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` **больше не нужны** — код, который их читал, удалён. Если они остались в переменных Vercel, их можно удалить.

На **Vercel** те же переменные заданы в настройках проекта; изменение переменной применяется только после нового деплоя.

### Файлы вне git (в `.gitignore`)
- `.env*` (кроме `.env.example`), `.mcp.json` (содержит Figma-токен для MCP), `figma-assets/`, `_client/`.
- Playwright-артефакты: `test-results/`, `playwright-report/`, `playwright/.cache/`.

### Зависимости, которые нужно поставить на чистой машине
```bash
npm install                       # все зависимости из package.json
npx playwright install chromium   # браузер для E2E (headless shell ~114 МБ)
```
Ключевые версии (из `package.json`): `next@16.2.7`, `react@19.2.4`, `sanity@^5.30`, `next-sanity@^13`, `tailwindcss@^4`, `vitest@4.1.x`, `@testing-library/react@^16`, `@playwright/test@^1.61`. TypeScript strict.

### Мелочи окружения
- Разработка шла на Windows (PowerShell + Git Bash), Node 24.16, npm 11.13. `git push` в GitHub из РФ периодически подвисает (троттлинг) — иногда нужно несколько попыток подряд.
- Sanity Studio доступна на `/studio` (встроенная, `force-dynamic`).
- Скрипты записи в Sanity: `scripts/seed.mjs`, `scripts/apply-client-edits.mjs` — ⚠️ `apply-client-edits.mjs` УДАЛЯЕТ все документы `service` и создаёт заново; запускать осознанно.
