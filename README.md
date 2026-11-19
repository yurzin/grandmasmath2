# Бабушкина математика

Сайт с подробными решениями задач профильного ЕГЭ по математике: сборники (PDF и решения на сайте), бесплатные варианты, «Реши сам», подписка, оплата через ЮKassa.

Nuxt 4 + Nuxt UI, PostgreSQL (Drizzle, NuxtHub), XeLaTeX для PDF-сборников.

## Разработка

```bash
npm install
cp .env.example .env          # настройки — в комментариях внутри
docker compose up -d          # PostgreSQL на localhost:5432
npm run dev                   # http://localhost:3000
```

Администратор: `npm run admin:create -- email@example.com "Имя"` (пароль спросит в терминале), админка — `/admin`.

## Содержимое

Сборники импортируются из LaTeX-исходников (`all_tasks.tex`) — нужен XeLaTeX и dvisvgm (рисунки TikZ → `public/figures/*.svg`, их нужно коммитить):

```bash
npm run db:import -- <сборник> --dry-run     # проверка, Markdown в .data/import-preview/
npm run db:import -- <сборник> [--overwrite]
npm run pdf:build -- <slug>                  # собрать PDF сборника
```

Список сборников и их настройки — `SOURCES` в `server/db/import/collection.ts`.

## Деплой

Подробная инструкция — **[DEPLOY.md](DEPLOY.md)**: сервер, Docker, HTTPS через Caddy, перенос базы, ЮKassa, резервные копии, обновления.

Коротко: `docker compose --profile app up -d --build` поднимает базу и сайт (порт 8080 на `127.0.0.1`).

## Полезные команды

| Команда | Что делает |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | Проверка типов |
| `npm run db:generate` | Миграция по изменениям схемы `server/db/schema.ts` |
| `npm run db:answer-keys` | Подобрать ключи ответов для «Реши сам» |
