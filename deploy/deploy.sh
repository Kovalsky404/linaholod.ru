#!/usr/bin/env bash
# Деплой обновления на сервере: подтянуть код, пересобрать, перезапустить.
# Запуск на сервере из каталога проекта:  bash deploy/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "→ git pull"
git pull --ff-only

echo "→ npm ci"
npm ci

echo "→ next build"
npm run build

echo "→ restart service"
sudo systemctl restart linaholod

echo "✓ Задеплоено: $(git rev-parse --short HEAD)"
