import { asc, eq, inArray } from 'drizzle-orm'
import { buildTaskLabel } from './tasks'

type Tx = Parameters<Parameters<typeof db['transaction']>[0]>[0]

/** Сборник целиком для редактора; 404, если нет. */
export async function loadAdminCollection(id: number): Promise<AdminCollection> {
    const [c] = await db.select().from(schema.collections).where(eq(schema.collections.id, id)).limit(1)
    if (!c) throw createError({ statusCode: 404, message: 'Сборник не найден' })

    const rows = await db
        .select({ taskId: schema.collectionTasks.taskId, isFree: schema.collectionTasks.isFree })
        .from(schema.collectionTasks)
        .where(eq(schema.collectionTasks.collectionId, id))
        .orderBy(asc(schema.collectionTasks.position))

    return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        price: c.price,
        status: c.status,
        version: c.version,
        coverUrl: c.coverUrl,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        tasks: rows,
        taskTitles: await loadTaskTitles(rows.map(r => r.taskId)),
    }
}

/** «#id · заголовок» для списков выбора задач. */
export async function loadTaskTitles(ids: number[]): Promise<Record<number, string>> {
    if (!ids.length) return {}
    const rows = await db
        .select({
            id: schema.tasks.id,
            title: schema.tasks.title,
            taskTypeNumber: schema.taskTypes.number,
            examLevel: schema.taskTypes.examLevel,
            topicName: schema.topics.name,
        })
        .from(schema.tasks)
        .innerJoin(schema.taskTypes, eq(schema.tasks.taskTypeId, schema.taskTypes.id))
        .leftJoin(schema.topics, eq(schema.tasks.topicId, schema.topics.id))
        .where(inArray(schema.tasks.id, ids))
    return Object.fromEntries(rows.map(r => [
        r.id,
        r.title ?? buildTaskLabel(r.taskTypeNumber, r.examLevel, r.topicName),
    ]))
}

/** Записывает поля сборника и заменяет состав (позиции = порядок в списке). */
export async function saveCollection(tx: Tx, input: AdminCollectionInput, id?: number) {
    const { tasks, ...fields } = input
    let collectionId = id
    if (collectionId) {
        const updated = await tx.update(schema.collections).set(fields)
            .where(eq(schema.collections.id, collectionId)).returning({ id: schema.collections.id })
        if (!updated.length) throw createError({ statusCode: 404, message: 'Сборник не найден' })
        await tx.delete(schema.collectionTasks).where(eq(schema.collectionTasks.collectionId, collectionId))
    } else {
        const [created] = await tx.insert(schema.collections).values(fields).returning({ id: schema.collections.id })
        collectionId = created!.id
    }
    if (tasks.length) {
        await tx.insert(schema.collectionTasks).values(
            tasks.map((t, i) => ({ collectionId: collectionId!, taskId: t.taskId, position: i + 1, isFree: t.isFree })),
        )
    }
    return collectionId
}
