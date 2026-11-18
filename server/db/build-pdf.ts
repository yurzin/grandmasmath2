/**
 * Собрать PDF сборника из БД:
 *
 *   npm run pdf:build -- economic-tasks [--tex папка] [--stamp "текст водяного знака"]
 *
 * PDF кладётся в кэш (.data/pdf/<slug>-<хеш>.pdf), путь печатается.
 * --tex сохраняет сгенерированные .tex-файлы (для отладки шаблона).
 * --stamp дополнительно пишет копию с водяным знаком рядом (-stamped.pdf).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import { collections } from './schema'
import { buildPdf, preparePdf, readCachedPdf, type TemplateSource } from '../lib/pdf/collection-pdf'
import { watermarkPdf } from '../lib/pdf/watermark'
import { LatexError } from '../lib/pdf/compile'

const TEMPLATE_DIR = 'server/pdf-template'

const args = process.argv.slice(2)
const option = (name: string) => {
    const i = args.indexOf(name)
    return i >= 0 ? args[i + 1] : undefined
}
const slug = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'))
if (!slug) {
    console.error('Использование: npm run pdf:build -- <slug сборника> [--tex папка] [--stamp "текст"]')
    process.exit(1)
}

const fsSource: TemplateSource = {
    text: path => readFile(join(TEMPLATE_DIR, path), 'utf8').catch(() => null),
    raw: path => readFile(join(TEMPLATE_DIR, path)).then(b => new Uint8Array(b)).catch(() => null),
}

process.loadEnvFile('.env')
const sql = postgres(process.env.DATABASE_URL!)
const db = drizzle(sql, { casing: 'snake_case' })

async function main() {
    const [collection] = await db.select({ id: collections.id }).from(collections).where(eq(collections.slug, slug!))
    if (!collection) throw new Error(`Сборник «${slug}» не найден`)

    const prepared = (await preparePdf(db, collection.id, fsSource))!
    for (const w of prepared.warnings) console.warn(`  ! ${w}`)

    const texDir = option('--tex')
    if (texDir) {
        await mkdir(texDir, { recursive: true })
        for (const [name, content] of Object.entries(prepared.files)) await writeFile(join(texDir, name), content)
        console.log(`LaTeX сохранён в ${texDir}`)
    }

    const started = Date.now()
    const result = await buildPdf(prepared)
    console.log(result.cached
        ? `Уже собран: ${prepared.path}`
        : `Собран за ${((Date.now() - started) / 1000).toFixed(1)} с (проходов: ${result.passes}), страниц: ${result.pages} → ${prepared.path}`)

    const stamp = option('--stamp')
    if (stamp) {
        const font = (await fsSource.raw('fonts/DejaVuSans.ttf'))!
        const stamped = await watermarkPdf(await readCachedPdf(prepared), { text: stamp, font, keywords: ['cli-test'] })
        const out = prepared.path.replace(/\.pdf$/, '-stamped.pdf')
        await writeFile(out, stamped)
        console.log(`С водяным знаком: ${out}`)
    }
}

main()
    .catch((err) => {
        if (err instanceof LatexError) console.error(`\n${err.message}\n\n${err.log}`)
        else console.error(err)
        process.exitCode = 1
    })
    .finally(() => sql.end())
