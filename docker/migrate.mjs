// Применяет миграции БД при старте контейнера. Совместим с NuxtHub: та же таблица _hub_migrations
// и те же имена (имя файла без .sql), поэтому базу можно вести попеременно и через `nuxt dev`.
// Лежит в .output/server, чтобы `postgres` находился в node_modules собранного приложения.
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import postgres from 'postgres'

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRESQL_URL
if (!url) {
    console.error('[migrate] Не задан DATABASE_URL')
    process.exit(1)
}
const dir = process.env.MIGRATIONS_DIR || '/app/migrations'

const sql = postgres(url, { onnotice: () => {}, max: 1 })
try {
    await sql`CREATE TABLE IF NOT EXISTS _hub_migrations (
        id         SERIAL PRIMARY KEY,
        name       TEXT UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`
    const applied = new Set((await sql`SELECT name FROM _hub_migrations`).map(r => r.name))
    const files = (await readdir(dir)).filter(f => f.endsWith('.sql')).sort()
    const pending = files.filter(f => !applied.has(f.replace(/\.sql$/, '')))

    for (const file of pending) {
        const name = file.replace(/\.sql$/, '')
        const statements = (await readFile(join(dir, file), 'utf8'))
            .split('--> statement-breakpoint')
            .map(s => s.trim())
            .filter(Boolean)
        await sql.begin(async (tx) => {
            // .simple(): в куске может быть несколько команд через «;» (как в 0005 с начальными тарифами).
            for (const statement of statements) await tx.unsafe(statement).simple()
            await tx`INSERT INTO _hub_migrations (name) VALUES (${name})`
        })
        console.log(`[migrate] применена ${name}`)
    }
    console.log(pending.length ? `[migrate] готово: ${pending.length}` : '[migrate] база в актуальном состоянии')
} catch (err) {
    console.error('[migrate] ошибка:', err.message)
    process.exitCode = 1
} finally {
    await sql.end()
}
