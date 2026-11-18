import { and, eq, inArray } from 'drizzle-orm'
import { buildTaskLabel } from '../utils/tasks'

export default defineEventHandler(async (event): Promise<TaskCard[]> => {
    const query = getQuery(event)

    // Бесплатные задачи — отмеченные бесплатными в опубликованных сборниках.
    const freeRows = await db
        .selectDistinct({ taskId: schema.collectionTasks.taskId })
        .from(schema.collectionTasks)
        .innerJoin(schema.collections, eq(schema.collectionTasks.collectionId, schema.collections.id))
        .where(and(eq(schema.collectionTasks.isFree, true), eq(schema.collections.status, 'published')))
    const freeIds = new Set(freeRows.map(r => r.taskId))

    const conditions = []
    if (query.topic) conditions.push(eq(schema.tasks.topicId, Number(query.topic)))
    if (query.task_type) conditions.push(eq(schema.tasks.taskTypeId, Number(query.task_type)))
    if (query.difficulty) conditions.push(eq(schema.tasks.difficulty, Number(query.difficulty)))
    if (query.free) {
        if (!freeIds.size) return []
        conditions.push(inArray(schema.tasks.id, [...freeIds]))
    }
    const limit = Math.min(Math.max(Number(query.limit) || 500, 1), 500)

    const rows = await db
        .select({
            id: schema.tasks.id,
            title: schema.tasks.title,
            body: schema.tasks.body,
            taskTypeNumber: schema.taskTypes.number,
            examLevel: schema.taskTypes.examLevel,
            topicName: schema.topics.name,
        })
        .from(schema.tasks)
        .innerJoin(schema.taskTypes, eq(schema.tasks.taskTypeId, schema.taskTypes.id))
        .leftJoin(schema.topics, eq(schema.tasks.topicId, schema.topics.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(schema.tasks.id)
        .limit(limit)

    return rows.map((row) => {
        const label = buildTaskLabel(row.taskTypeNumber, row.examLevel, row.topicName)
        return {
            id: row.id,
            title: row.title ?? label,
            label,
            excerptHtml: markdownExcerpt(row.body),
            isFree: freeIds.has(row.id),
        }
    })
})
