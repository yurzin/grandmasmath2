import { z } from 'zod'

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const optionalText = (max: number) => z.string().trim().max(max).nullable()
    .transform(v => (v ? v : null))

export const taskInputSchema = z.object({
    title: optionalText(255),
    taskTypeId: z.number().int().positive(),
    topicId: z.number().int().positive().nullable(),
    difficulty: z.number().int().min(1).max(5),
    body: z.string().trim().min(1, 'Условие не может быть пустым'),
    answer: z.string().trim().min(1, 'Укажите ответ').max(255),
    answerKey: optionalText(255),
    imageUrl: optionalText(500),
    source: optionalText(255),
    solutions: z.array(z.string().trim()).transform(list => list.filter(Boolean)),
}) satisfies z.ZodType<AdminTaskInput, unknown>

export const collectionInputSchema = z.object({
    slug: z.string().trim().toLowerCase()
        .regex(SLUG_RE, 'Только латиница, цифры и дефисы, например economic-tasks')
        .max(255),
    title: z.string().trim().min(1, 'Укажите название').max(255),
    description: optionalText(5000),
    price: z.number().int().min(0).nullable(),
    status: z.enum(['draft', 'published', 'archived']),
    version: z.number().int().min(1),
    coverUrl: optionalText(500),
    tasks: z.array(z.object({ taskId: z.number().int().positive(), isFree: z.boolean() }))
        .refine(list => new Set(list.map(t => t.taskId)).size === list.length, 'Задача добавлена дважды'),
}) satisfies z.ZodType<AdminCollectionInput, unknown>

export const topicInputSchema = z.object({
    name: z.string().trim().min(1, 'Укажите название').max(255),
    slug: z.string().trim().toLowerCase().max(255),
})
    // Пустой адрес — из названия.
    .transform(t => ({ ...t, slug: t.slug || slugify(t.name) }))
    .refine(t => SLUG_RE.test(t.slug), { path: ['slug'], message: 'Только латиница, цифры и дефисы' })

export const planInputSchema = z.object({
    months: z.number().int().min(1).max(36),
    price: z.number().int().min(1),
    active: z.boolean(),
})

export const taskTypeInputSchema = z.object({
    number: z.number().int().min(1).max(99),
    examLevel: z.enum(['base', 'profile']),
    name: z.string().trim().min(1, 'Укажите название').max(255),
}) satisfies z.ZodType<AdminTaskTypeInput, unknown>

/**
 * Ошибки Postgres → понятные HTTP-ответы:
 * 23505 (уникальность) → 409 с uniqueMessage, 23503 (внешний ключ) → 400.
 */
export function rethrowDbError(err: unknown, uniqueMessage = 'Такая запись уже есть'): never {
    const e = err as { code?: string, cause?: { code?: string } }
    const code = e?.cause?.code ?? e?.code
    if (code === '23505') throw createError({ statusCode: 409, message: uniqueMessage })
    if (code === '23503') throw createError({ statusCode: 400, message: 'Ссылка на несуществующую запись (номер ЕГЭ, тема или задача)' })
    throw err
}
