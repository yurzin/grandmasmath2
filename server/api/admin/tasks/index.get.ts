import { and, desc, eq, ilike, inArray, notExists, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { buildTaskLabel } from '../../../utils/tasks'

const querySchema = z.object({
    q: z.string().trim().optional(),
    // id сборника или 'none' — задачи вне сборников
    collection: z.union([z.literal('none'), z.coerce.number().int().positive()]).optional(),
})

export default defineAdminHandler(async (event): Promise<AdminTaskListItem[]> => {
    const { q, collection } = await getValidatedQuery(event, validator(querySchema))

    const conditions = []
    if (q) {
        const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`
        const asId = Number(q)
        conditions.push(or(
            ilike(schema.tasks.title, pattern),
            ilike(schema.tasks.body, pattern),
            Number.isInteger(asId) ? eq(schema.tasks.id, asId) : undefined,
        ))
    }
    if (collection === 'none') {
        conditions.push(notExists(
            db.select({ one: sql`1` }).from(schema.collectionTasks)
                .where(eq(schema.collectionTasks.taskId, schema.tasks.id)),
        ))
    } else if (collection) {
        conditions.push(inArray(
            schema.tasks.id,
            db.select({ id: schema.collectionTasks.taskId }).from(schema.collectionTasks)
                .where(eq(schema.collectionTasks.collectionId, collection)),
        ))
    }

    const rows = await db
        .select({
            id: schema.tasks.id,
            title: schema.tasks.title,
            difficulty: schema.tasks.difficulty,
            updatedAt: schema.tasks.updatedAt,
            taskTypeNumber: schema.taskTypes.number,
            examLevel: schema.taskTypes.examLevel,
            topicName: schema.topics.name,
        })
        .from(schema.tasks)
        .innerJoin(schema.taskTypes, eq(schema.tasks.taskTypeId, schema.taskTypes.id))
        .leftJoin(schema.topics, eq(schema.tasks.topicId, schema.topics.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(schema.tasks.updatedAt), desc(schema.tasks.id))

    const memberships = rows.length
        ? await db
            .select({
                taskId: schema.collectionTasks.taskId,
                id: schema.collections.id,
                title: schema.collections.title,
                position: schema.collectionTasks.position,
            })
            .from(schema.collectionTasks)
            .innerJoin(schema.collections, eq(schema.collectionTasks.collectionId, schema.collections.id))
            .where(inArray(schema.collectionTasks.taskId, rows.map(r => r.id)))
        : []

    return rows.map(row => ({
        id: row.id,
        title: row.title,
        label: buildTaskLabel(row.taskTypeNumber, row.examLevel, row.topicName),
        difficulty: row.difficulty,
        updatedAt: row.updatedAt.toISOString(),
        collections: memberships
            .filter(m => m.taskId === row.id)
            .map(({ id, title, position }) => ({ id, title, position })),
    }))
})
