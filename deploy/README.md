# Перенос linaholod.ru на российский VPS

Зачем: из РФ домен на Vercel режется по SNI (ТСПУ). Российский хостинг снимает
блокировку и закрывает 152-ФЗ ст. 18 ч. 5 (локализация ПД россиян в РФ).

Архитектура: `Пользователь → nginx :80/:443 (Let's Encrypt) → Next.js :3000 (systemd)`.
ПД из формы первично пишется на RF-сервере (`/api/lead`), затем трансгранично в
Telegram (покрыто согласием). **Sanity остаётся** — там только контент сайта, не ПД.

---

## 0. Что подготовить заранее
- VPS: Ubuntu 24.04, 1–2 vCPU / 2 ГБ RAM / 20 ГБ (Timeweb Cloud / Selectel / Yandex Cloud).
- Доступ по SSH (root или sudo-пользователь).
- Содержимое локального `.env.local` (ключи Sanity, Telegram, `NEXT_PUBLIC_SITE_URL`).

## 1. Базовая настройка сервера
```bash
# под root
adduser deploy && usermod -aG sudo deploy
apt update && apt upgrade -y
apt install -y nginx git curl ufw

# Node 20 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v && npm -v   # ожидаем v20+

# Firewall
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable
```

## 2. Код проекта
```bash
# под deploy
sudo mkdir -p /var/www/linaholod && sudo chown deploy:deploy /var/www/linaholod
git clone https://github.com/Kovalsky404/linaholod.ru.git /var/www/linaholod
cd /var/www/linaholod
```
> Если `git clone` из GitHub тормозит из РФ — завести зеркало на Gitverse/GitFlic
> и клонировать оттуда (см. раздел «Деплой без GitHub» ниже).

Создать `/var/www/linaholod/.env.local` со всеми ключами (как локально).
`NEXT_PUBLIC_SITE_URL=https://linaholod.ru`.

```bash
npm ci
npm run build
```

## 3. Автозапуск (systemd)
```bash
sudo cp deploy/systemd/linaholod.service /etc/systemd/system/linaholod.service
sudo systemctl daemon-reload
sudo systemctl enable --now linaholod
sudo systemctl status linaholod     # active (running)
curl -I http://127.0.0.1:3000        # 200 — Next отвечает локально
```

## 4. nginx + сертификат (порядок важен — иначе 443 не стартует без cert)
```bash
sudo mkdir -p /var/www/certbot
sudo cp deploy/nginx/linaholod.ru.conf /etc/nginx/sites-available/linaholod.ru.conf
sudo ln -s /etc/nginx/sites-available/linaholod.ru.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

ДО получения сертификата временно закомментировать ОБА блока `server { ... 443 ... }`
в конфиге (иначе `nginx -t` упадёт — нет файлов cert). Затем:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

Получить сертификат (webroot, без остановки nginx):
```bash
sudo apt install -y certbot
sudo certbot certonly --webroot -w /var/www/certbot \
  -d linaholod.ru -d www.linaholod.ru \
  --email <твой-email> --agree-tos --no-eff-email
```
> Важно: ACME-проверка идёт по HTTP, поэтому DNS уже должен указывать на сервер
> (см. шаг 5). Если ещё нет — сначала шаг 5, потом certbot.

Раскомментировать 443-блоки, перезагрузить и включить автопродление:
```bash
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl enable --now certbot.timer   # авто-renew
```

## 5. DNS на reg.ru (перевод с Vercel)
В панели reg.ru → DNS зоны `linaholod.ru`:
- `@` (apex) — запись **A** → IP сервера (удалить старую A `216.198.79.1`).
- `www` — запись **A** → IP сервера (удалить CNAME на Vercel).
- TTL поставить 300, дождаться обновления (`nslookup linaholod.ru`).

После переключения DNS — выполнить шаг 4 (certbot), если не сделан.

## 6. Проверка
```bash
curl -I https://linaholod.ru          # 200
curl -I https://www.linaholod.ru      # 301 → https://linaholod.ru
```
Открыть с телефона БЕЗ VPN — сайт должен грузиться.

## 7. Vercel
Когда RF-хостинг работает — в Vercel убрать кастомные домены (проект можно
оставить как резерв/preview на `*.vercel.app`).

---

## Обновление сайта (деплой)
```bash
cd /var/www/linaholod
bash deploy/deploy.sh        # git pull → npm ci → build → restart
```

## Деплой без GitHub (если pull из РФ тормозит)
Вариант А — зеркало на российском git (Gitverse/GitFlic): добавить второй remote,
пушить туда, на сервере `git pull` из зеркала.
Вариант Б — rsync собранного проекта с локальной машины:
```bash
# локально (сборка), затем заливка исходников на сервер:
rsync -az --delete --exclude node_modules --exclude .next --exclude .git \
  ./ deploy@<IP>:/var/www/linaholod/
# на сервере: npm ci && npm run build && sudo systemctl restart linaholod
```

## Заметки
- `.env.local` нужен ДО `npm run build` (переменные `NEXT_PUBLIC_*` вшиваются в бандл).
- ISR (`revalidate = 60`) пишет кэш на диск — на одном VPS работает из коробки.
- Оптимизация картинок `next/image` работает на `next start` без настройки;
  на glibc может потребоваться донастройка sharp при росте памяти.
- Логи: `journalctl -u linaholod -f`.
