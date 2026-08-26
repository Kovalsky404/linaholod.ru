#!/usr/bin/env bash
# Осмотр сервера ПЕРЕД добавлением второго сайта. Только чтение, ничего не меняет.
# Запуск:  bash inspect.sh   (часть пунктов требует sudo — тогда: sudo bash inspect.sh)
echo "──────── СИСТЕМА ────────"
. /etc/os-release 2>/dev/null && echo "ОС: $PRETTY_NAME  ($(uname -m))"
echo "RAM: $(free -m | awk '/Mem:/{print $2" МБ, свободно "$7" МБ"}')"
echo "Диск /: $(df -h / | awk 'NR==2{print $2" всего, "$4" свободно"}')"

echo
echo "──────── NODE / NPM ────────"
command -v node >/dev/null && echo "node: $(node -v)   npm: $(npm -v)   путь: $(command -v node)" || echo "node НЕ установлен"
command -v nvm >/dev/null 2>&1 && echo "nvm: есть" || true
ls -d /home/*/.nvm 2>/dev/null && echo "^ у кого-то есть nvm — версия Node может отличаться от системной"
command -v pm2 >/dev/null && echo "pm2: есть ($(pm2 -v)) — соседний проект может жить под ним" || echo "pm2: нет"

echo
echo "──────── ЧТО СЛУШАЕТ ПОРТЫ ────────"
(ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null) | grep -E 'LISTEN' | awk '{print $4"  "$6$7}' | sort -u

echo
echo "──────── NGINX ────────"
command -v nginx >/dev/null && nginx -v 2>&1 || echo "nginx НЕ установлен"
echo "включённые сайты:"; ls -l /etc/nginx/sites-enabled/ 2>/dev/null || echo "  (каталога нет)"
echo "server_name во всех конфигах:"
grep -rhE '^\s*server_name' /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null | tr -s ' ' | sort -u

echo
echo "──────── СЕРВИСЫ ────────"
systemctl list-units --type=service --state=running --no-pager --no-legend 2>/dev/null | grep -viE 'systemd|dbus|cron|ssh|rsyslog|polkit|udev|networkd|resolved|journald|getty|snapd|unattended' | awk '{print "  "$1}'

echo
echo "──────── СЕРТИФИКАТЫ ────────"
command -v certbot >/dev/null && certbot certificates 2>/dev/null | grep -E 'Certificate Name|Domains|Expiry' || echo "certbot не установлен или нет прав (нужен sudo)"

echo
echo "──────── ДОСТУП К SANITY (критично для картинок) ────────"
for u in https://cdn.sanity.io/ https://api.sanity.io/v1/ping; do
  printf "%-32s " "$u"; curl -s -o /dev/null -w "%{http_code} за %{time_total}с\n" --max-time 10 "$u" || echo "НЕТ ДОСТУПА"
done

echo
echo "──────── GITHUB (для git clone) ────────"
printf "%-32s " "https://github.com"; curl -s -o /dev/null -w "%{http_code} за %{time_total}с\n" --max-time 10 https://github.com || echo "НЕТ ДОСТУПА"
