/**
 * Импорт сборника из LaTeX-исходника (all_tasks.tex в разметке 	ask / uslovie / eshenie / otvet).
 *
 *   npm run db:import -- <сборник> [путь к all_tasks.tex] [--dry-run] [--overwrite]
 *   сборники: econ (№16, экономические задачи), params (№18, задачи с параметром), prob (№5, теория вероятностей), ineq (№15, неравенства)
 *
 * Если сборник уже есть в БД, нужен --overwrite: задачи сопоставляются по позиции
 * в сборнике и обновляются на месте (id не меняются), решения перезаписываются —
 * правки, сделанные в админке, при этом теряются.
 * --dry-run ничего не пишет в БД, а сохраняет Markdown в .data/import-preview/.
 * Рисунки TikZ отрисовываются в public/figures/*.svg (их нужно закоммитить).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { and, eq } from 'drizzle-orm'
import { collections, collectionTasks, solutions, taskTypes, tasks, topics } from '../schema'
import { parseCollection } from './parse-collection'
import { renderTikzFigures } from './tikz-figures'
import { suggestAnswerKey } from '../../../shared/utils/answer-key'
import { EGE_PROFILE_TASKS } from '../../../shared/utils/ege'
import { renderMarkdown } from '../../utils/markdown'
import { extractTikz } from '../../lib/tikz'

interface CollectionSource {
    source: string
    collection: { slug: string, title: string, description: string }
    taskTypeNumber: number
    topic: { name: string, slug: string } | null
    difficulty: number
    /** Какие варианты открыть бесплатно при первой загрузке; дальше бесплатность меняют в админке. */
    freeVariants: number[]
    /** Подбирать ключ ответа для «Реши сам» (только когда ответы — числа). */
    answerKeys: boolean
}

const SOURCES: Record<string, CollectionSource> = {
    econ: {
        source: 'D:/work/Math/Economic/scan/build/all_tasks.tex',
        collection: {
            slug: 'economic-tasks',
            title: 'Решение экономических задач ЕГЭ',
            description: 'Подробные решения 36 экономических задач (№16 профильного ЕГЭ): кредиты с аннуитетными и дифференцированными платежами, вклады, выбор выгодного варианта.',
        },
        taskTypeNumber: 16,
        topic: { name: 'Финансовая математика', slug: 'financial-math' },
        difficulty: 4,
        freeVariants: [1, 2, 3],
        answerKeys: true,
    },
    params: {
        source: 'D:/work/Math/Parameters/18/scan/build/all_tasks.tex',
        collection: {
            slug: 'parameter-tasks',
            title: 'Решение задач с параметром ЕГЭ',
            description: 'Подробные решения 38 задач с параметром (№18 профильного ЕГЭ): уравнения и системы с модулями, корнями и логарифмами, графический метод, касание окружностей.',
        },
        taskTypeNumber: 18,
        topic: null,
        difficulty: 5,
        // Разные методы: модуль по случаям, графический (с рисунком), прямые и гиперболы.
        freeVariants: [1, 7, 12],
        // Ответы — промежутки и множества; автоподбор ключа для них не работает.
        answerKeys: false,
    },
    prob: {
        source: 'D:/work/Math/Theory/scan/build/all_tasks.tex',
        collection: {
            slug: 'probability-tasks',
            title: 'Решение задач по теории вероятностей ЕГЭ',
            description: 'Подробные решения 136 задач по теории вероятностей (№5 профильного ЕГЭ): игральные кости и монеты, формула полной вероятности, независимые события, сочетания, выбор групп и рассадка за круглым столом.',
        },
        taskTypeNumber: 5,
        topic: null,
        difficulty: 2,
        // Разные приёмы: таблица исходов двух бросков, уравнение для полной вероятности, схема дорожек с рисунком.
        freeVariants: [1, 15, 101],
        // Ответы — числа, «Реши сам» работает.
        answerKeys: true,
    },
    ineq: {
        source: 'D:/work/Math/Logarithms/scan/build/all_tasks.tex',
        collection: {
            slug: 'inequality-tasks',
            title: 'Решение неравенств ЕГЭ',
            description: 'Подробные решения 28 неравенств (№15 профильного ЕГЭ): показательные, логарифмические и иррациональные, логарифм с переменным основанием, метод рационализации, двойная замена, метод интервалов.',
        },
        taskTypeNumber: 15,
        topic: null,
        difficulty: 4,
        // Разные приёмы: метод рационализации, двойная замена, модуль с логарифмом.
        freeVariants: [1, 2, 9],
        // Ответы — промежутки; автоподбор ключа для них не работает.
        answerKeys: false,
    },
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const [key, sourceArg] = args.filter(a => !a.startsWith('--'))
const found = key ? SOURCES[key] : undefined
if (!found) {
    console.error(`Укажите сборник: ${Object.keys(SOURCES).join(', ')}`)
    process.exit(1)
}
const config: CollectionSource = found
const { collection: COLLECTION } = config
const TASK_TYPE = { number: config.taskTypeNumber, examLevel: 'profile' as const, name: EGE_PROFILE_TASKS[config.taskTypeNumber]! }
const source = sourceArg ?? config.source

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

// Рисунки: SVG для сайта (в PDF идёт сам код TikZ).
const figures = parsed.flatMap(t => [t.body, ...t.solutions].flatMap(extractTikz))
if (figures.length) {
    const created = renderTikzFigures(figures)
    console.log(`Рисунков: ${figures.length}, новых SVG: ${created}`)
}

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
    const [already] = await db.select({ id: collections.id }).from(collections).where(eq(collections.slug, COLLECTION.slug))
    if (already && !args.includes('--overwrite')) {
        throw new Error(
            `Сборник «${COLLECTION.slug}» уже есть в БД. Импорт перезапишет правки, сделанные в админке.\n`
            + 'Если это и нужно — запустите с флагом --overwrite.',
        )
    }

    await db.transaction(async (tx) => {
        await tx.insert(taskTypes).values(TASK_TYPE).onConflictDoNothing()
        const [taskType] = await tx.select().from(taskTypes)
            .where(and(eq(taskTypes.number, TASK_TYPE.number), eq(taskTypes.examLevel, TASK_TYPE.examLevel)))

        let topicId: number | null = null
        if (config.topic) {
            await tx.insert(topics).values(config.topic).onConflictDoNothing()
            const [topic] = await tx.select().from(topics).where(eq(topics.slug, config.topic.slug))
            topicId = topic!.id
        }

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
                topicId,
                difficulty: config.difficulty,
                title: t.title,
                body: t.body,
                answer: t.answer,
                answerKey: config.answerKeys ? suggestAnswerKey(t.answer) : null,
                source: `${COLLECTION.title}, вариант ${t.position}`,
            }

            let taskId = byPosition.get(t.position)
            if (taskId) {
                // Пометку «на проверке», которую автор уже снял, повторный импорт с тем же текстом не возвращает.
                const [current] = await tx.select({ cleared: tasks.reviewClearedNote }).from(tasks).where(eq(tasks.id, taskId))
                const reviewNote = t.reviewNote && t.reviewNote !== current?.cleared ? t.reviewNote : null
                await tx.update(tasks).set({ ...values, reviewNote }).where(eq(tasks.id, taskId))
                await tx.delete(solutions).where(eq(solutions.taskId, taskId))
                // Бесплатность не трогаем: после первой загрузки ею управляют из админки.
                updated++
            } else {
                const [task] = await tx.insert(tasks).values({ ...values, reviewNote: t.reviewNote }).returning({ id: tasks.id })
                taskId = task!.id
                await tx.insert(collectionTasks).values({
                    collectionId: collection!.id,
                    taskId,
                    position: t.position,
                    isFree: config.freeVariants.includes(t.position),
                })
                created++
            }

            await tx.insert(solutions).values(
                t.solutions.map((body, i) => ({ taskId: taskId!, body, sortOrder: i + 1 })),
            )
        }
        console.log(`Сборник «${collection!.title}»: создано ${created}, обновлено ${updated}`)
        const toReview = parsed.filter(t => t.reviewNote).map(t => t.position)
        if (toReview.length) console.log(`На проверке у автора (по пометкам в исходнике): варианты ${toReview.join(', ')}`)
    })
}

main()
    .catch((err) => {
        // Ошибки БД — со стеком, свои проверки — только текстом.
        console.error(err?.code ? err : `\n${err instanceof Error ? err.message : err}`)
        process.exitCode = 1
    })
    .finally(() => sql.end())
