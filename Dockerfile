# Образ сайта: сборка Nuxt → Node-сервер + XeLaTeX для PDF-сборников.
#   docker compose up -d --build        (вместе с базой, см. docker-compose.yml)

# ---------- сборка ----------
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# DATABASE_URL при сборке не нужен и не должен попасть в образ (адрес берётся при запуске).
RUN npm run build

# ---------- запуск ----------
FROM node:24-bookworm-slim AS runtime

# XeLaTeX и шрифты для PDF (шаблон: server/pdf-template/main.tex — fontspec, unicode-math, polyglossia,
# tcolorbox, tikz, titletoc…; DejaVu Sans + DejaVu Math TeX Gyre).
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        texlive-xetex texlive-latex-extra texlive-pictures texlive-lang-cyrillic texlive-fonts-recommended \
        fonts-dejavu fonts-texgyre fonts-texgyre-math \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    PDF_CACHE_DIR=/app/.data/pdf \
    MIGRATIONS_DIR=/app/migrations

COPY --from=build /app/.output ./.output
COPY --from=build /app/server/db/migrations/postgresql ./migrations
COPY --from=build /app/docker/migrate.mjs ./.output/server/migrate.mjs

# Кэш собранных PDF — в томе, чтобы переживал пересоздание контейнера.
RUN mkdir -p /app/.data/pdf && chown -R node:node /app/.data
VOLUME /app/.data
USER node

EXPOSE 3000
# Сначала миграции, потом сервер; если миграция не прошла, сервер не стартует.
CMD ["sh", "-c", "node .output/server/migrate.mjs && exec node .output/server/index.mjs"]
