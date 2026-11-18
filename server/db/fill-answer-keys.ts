/**
 * Заполнить «ответ для проверки» у задач, где он пуст, — из текстового ответа:
 *
 *   npm run db:answer-keys            — показать, что будет записано
 *   npm run db:answer-keys -- --write — записать
 *
 * Уже заполненные ключи не трогает. Проверьте результат в админке.
 */
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq, isNull } from 'drizzle-orm'
import { tasks } from './schema'
import { suggestAnswerKey } from '../../shared/utils/answer-key'

const write = process.argv.includes('--write')

process.loadEnvFile('.env')
const sql = postgres(process.env.DATABASE_URL!)
const db = drizzle(sql, { casing: 'snake_case' })

async function main() {
    const rows = await db.select({ id: tasks.id, answer: tasks.answer }).from(tasks).where(isNull(tasks.answerKey))
    let filled = 0
    for (const row of rows) {
        const key = suggestAnswerKey(row.answer)
        console.log(`#${String(row.id).padEnd(4)} ${row.answer.slice(0, 50).padEnd(50)} → ${key || '(не удалось — заполните вручную)'}`)
        if (write && key) {
            await db.update(tasks).set({ answerKey: key }).where(eq(tasks.id, row.id))
            filled++
        }
    }
    console.log(write ? `\nЗаписано: ${filled} из ${rows.length}` : `\nЗадач без ключа: ${rows.length}. Чтобы записать — добавьте --write`)
}

main()
    .catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
    .finally(() => sql.end())
