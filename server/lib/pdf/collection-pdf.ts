// PDF сборника: данные из БД → LaTeX → XeLaTeX, с кэшем по хешу содержимого.
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { asc, eq, inArray } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import * as schema from '../../db/schema'
import { buildCollectionTex, type PdfCollection } from './collection-tex'
import { compileLatex } from './compile'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- и NuxtHub-db, и postgres-js в CLI
type Db = PgDatabase<PgQueryResultHKT, any>

/** Откуда брать файлы шаблона (Nitro server assets или диск в CLI). Пути через «/». */
export interface TemplateSource {
    text(path: string): Promise<string | null>
    raw(path: string): Promise<Uint8Array | null>
}

export const PDF_CACHE_DIR = process.env.PDF_CACHE_DIR || '.data/pdf'

export async function loadPdfCollection(db: Db, collectionId: number) {
    const [collection] = await db.select().from(schema.collections).where(eq(schema.collections.id, collectionId)).limit(1)
    if (!collection) return null

    const rows = await db
        .select({
            id: schema.tasks.id,
            position: schema.collectionTasks.position,
            title: schema.tasks.title,
            body: schema.tasks.body,
            answer: schema.tasks.answer,
            taskTypeNumber: schema.taskTypes.number,
            taskTypeName: schema.taskTypes.name,
            examLevel: schema.taskTypes.examLevel,
        })
        .from(schema.collectionTasks)
        .innerJoin(schema.tasks, eq(schema.collectionTasks.taskId, schema.tasks.id))
        .innerJoin(schema.taskTypes, eq(schema.tasks.taskTypeId, schema.taskTypes.id))
        .where(eq(schema.collectionTasks.collectionId, collectionId))
        .orderBy(asc(schema.collectionTasks.position))

    const solutionRows = rows.length
        ? await db.select({ taskId: schema.solutions.taskId, body: schema.solutions.body })
            .from(schema.solutions)
            .where(inArray(schema.solutions.taskId, rows.map(r => r.id)))
            .orderBy(asc(schema.solutions.sortOrder))
        : []

    const data: PdfCollection = {
        slug: collection.slug,
        title: collection.title,
        tasks: rows.map(({ id, ...t }) => ({
            ...t,
            solutions: solutionRows.filter(s => s.taskId === id).map(s => s.body),
        })),
    }
    return { collection, data }
}

export interface PreparedPdf {
    slug: string
    hash: string
    path: string
    files: Record<string, string>
    warnings: string[]
}

/** Генерирует LaTeX и считает хеш; сам PDF не собирает. */
export async function preparePdf(db: Db, collectionId: number, source: TemplateSource): Promise<PreparedPdf | null> {
    const loaded = await loadPdfCollection(db, collectionId)
    if (!loaded) return null
    const [main, cover, defaultCover] = await Promise.all([
        source.text('main.tex'),
        source.text(`covers/${loaded.data.slug}.tex`),
        source.text('covers/default.tex'),
    ])
    if (!main || !defaultCover) throw new Error('Не найден шаблон PDF (server/pdf-template)')

    const { files, warnings } = buildCollectionTex(loaded.data, { main, cover, defaultCover })
    const hash = createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0, 16)
    return { slug: loaded.data.slug, hash, path: join(PDF_CACHE_DIR, `${loaded.data.slug}-${hash}.pdf`), files, warnings }
}

export async function cachedPdfInfo(prepared: PreparedPdf) {
    const info = await stat(prepared.path).catch(() => null)
    return info ? { builtAt: info.mtime.toISOString(), size: info.size } : null
}

const inFlight = new Map<string, Promise<{ pages: number, passes: number }>>()

/** Собирает PDF, если его ещё нет в кэше. Параллельные запросы одного и того же ждут одну сборку. */
export async function buildPdf(prepared: PreparedPdf): Promise<{ cached: boolean, pages?: number, passes?: number }> {
    if (await cachedPdfInfo(prepared)) return { cached: true }
    let job = inFlight.get(prepared.path)
    if (!job) {
        job = (async () => {
            const { pdf, pages, passes } = await compileLatex(prepared.files)
            await mkdir(PDF_CACHE_DIR, { recursive: true })
            const tmp = `${prepared.path}.tmp`
            await writeFile(tmp, pdf)
            await rename(tmp, prepared.path) // атомарно: недописанный файл не попадёт в кэш
            await removeStaleVersions(prepared)
            return { pages, passes }
        })().finally(() => inFlight.delete(prepared.path))
        inFlight.set(prepared.path, job)
    }
    return { cached: false, ...(await job) }
}

/** Удаляет из кэша прежние сборки этого сборника (<slug>-<другой хеш>.pdf). */
async function removeStaleVersions(prepared: PreparedPdf) {
    const current = basename(prepared.path)
    // slug — только [a-z0-9-], спецсимволов регулярных выражений в нём нет.
    // Точный шаблон: иначе для «economic» под удаление попали бы файлы «economic-tasks-…».
    const ownFile = new RegExp(`^${prepared.slug}-[0-9a-f]{16}(-stamped)?\\.pdf$`)
    const stale = (await readdir(PDF_CACHE_DIR)).filter(name => name !== current && ownFile.test(name))
    await Promise.all(stale.map(name => unlink(join(PDF_CACHE_DIR, name)).catch(() => {})))
}

export function readCachedPdf(prepared: PreparedPdf) {
    return readFile(prepared.path)
}
