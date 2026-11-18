/**
 * Импорт сборника «Решение экономических задач ЕГЭ» из LaTeX-исходника.
 *
 *   npm run db:import-econ -- [путь к all_tasks.tex] [--dry-run]
 *
 * Повторный запуск безопасен: задачи сопоставляются по позиции в сборнике,
 * обновляются на месте (id не меняются), решения перезаписываются.
 * --dry-run ничего не пишет в БД, а сохраняет Markdown в .data/import-preview/.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { and, eq } from 'drizzle-orm'
import { collections, collectionTasks, solutions, taskTypes, tasks, topics } from '../schema'
import { parseCollection } from './parse-collection'
import { renderMarkdown } from '../../utils/markdown'

const DEFAULT_SOURCE = 'D:/work/Math/Economic/scan/build/all_tasks.tex'

const COLLECTION = {
    slug: 'economic-tasks',
    title: 'Решение экономических задач ЕГЭ',
    description: 'Подробные решения 36 экономических задач (№16 профильного ЕГЭ): кредиты с аннуитетными и дифференцированными платежами, вклады, выбор выгодного варианта.',
}
const TASK_TYPE = { number: 16, examLevel: 'profile' as const, name: 'Экономическая задача' }
const TOPIC = { name: 'Финансовая математика', slug: 'financial-math' }
const DIFFICULTY = 4
/** Сколько первых вариантов открыть бесплатно (демо). */
const FREE_COUNT = 3

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const source = args.find(a => !a.startsWith('--')) ?? DEFAULT_SOURCE

const parsed = parseCollection(readFileSync(source, 'utf8')).sort((a, b) => a.position - b.position)
console.log(`Разобрано задач: ${parsed.length}`)

const warnings = parsed.flatMap(t => t.warnings)

// Проверяем, что все формулы разбираются KaTeX.
for (const t of parsed) {
    for (const md of [t.body, t.answer, ...t.solutions]) {
        for (const m of renderMarkdown(md).matchAll(/class="katex-error"[^>]*title="([^"]*)"/g)) {
            warnings.push(`Вариант ${t.position}: ошибка KaTeX — ${m[1]}`)
        }
    }
}
for (const w of warnings) console.warn(`  ! ${w}`)

if (dryRun) {
    const dir = '.data/import-preview'
    mkdirSync(dir, { recursive: true })
    const html: string[] = []
    for (const t of parsed) {
        const md = [
            `# ${t.position}. ${t.title}`,
            t.body,
            ...t.solutions.map((s, i) => `---\n\n## ${i ? 'Другое решение' : 'Решение'}\n\n${s}`),
            `---\n\n**Ответ:** ${t.answer}`,
        ].join('\n\n')
        writeFileSync(join(dir, `${String(t.position).padStart(2, '0')}.md`), md + '\n')
        html.push(`<article>${renderMarkdown(md)}</article>`)
    }
    writeFileSync(join(dir, 'index.html'), `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="../../node_modules/katex/dist/katex.min.css">
<style>body{max-width:800px;margin:auto;font-family:sans-serif}article{border-bottom:3px solid #999;padding:1em 0}
table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}</style>
${html.join('\n')}`)
    console.log(`Dry run: Markdown и index.html сохранены в ${dir}`)
    process.exit(warnings.length ? 1 : 0)
}

process.loadEnvFile('.env')
const sql = postgres(process.env.DATABASE_URL!)
const db = drizzle(sql, { casing: 'snake_case' })

async function main() {
    await db.transaction(async (tx) => {
        await tx.insert(taskTypes).values(TASK_TYPE).onConflictDoNothing()
        const [taskType] = await tx.select().from(taskTypes)
            .where(and(eq(taskTypes.number, TASK_TYPE.number), eq(taskTypes.examLevel, TASK_TYPE.examLevel)))

        await tx.insert(topics).values(TOPIC).onConflictDoNothing()
        const [topic] = await tx.select().from(topics).where(eq(topics.slug, TOPIC.slug))

        const [collection] = await tx.insert(collections)
            .values({ ...COLLECTION, status: 'published' })
            .onConflictDoUpdate({
                target: collections.slug,
                set: { title: COLLECTION.title, description: COLLECTION.description },
            })
            .returning()

        const existing = await tx.select().from(collectionTasks)
            .where(eq(collectionTasks.collectionId, collection!.id))
        const byPosition = new Map(existing.map(ct => [ct.position, ct.taskId]))

        let created = 0
        let updated = 0
        for (const t of parsed) {
            const values = {
                taskTypeId: taskType!.id,
                topicId: topic!.id,
                difficulty: DIFFICULTY,
                title: t.title,
                body: t.body,
                answer: t.answer,
                source: `${COLLECTION.title}, вариант ${t.position}`,
            }

            let taskId = byPosition.get(t.position)
            if (taskId) {
                await tx.update(tasks).set(values).where(eq(tasks.id, taskId))
                await tx.delete(solutions).where(eq(solutions.taskId, taskId))
                await tx.update(collectionTasks)
                    .set({ isFree: t.position <= FREE_COUNT })
                    .where(and(eq(collectionTasks.collectionId, collection!.id), eq(collectionTasks.taskId, taskId)))
                updated++
            } else {
                const [task] = await tx.insert(tasks).values(values).returning({ id: tasks.id })
                taskId = task!.id
                await tx.insert(collectionTasks).values({
                    collectionId: collection!.id,
                    taskId,
                    position: t.position,
                    isFree: t.position <= FREE_COUNT,
                })
                created++
            }

            await tx.insert(solutions).values(
                t.solutions.map((body, i) => ({ taskId: taskId!, body, sortOrder: i + 1 })),
            )
        }
        console.log(`Сборник «${collection!.title}»: создано ${created}, обновлено ${updated}`)
    })
}

main()
    .catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
    .finally(() => sql.end())
