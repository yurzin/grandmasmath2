import { and, eq } from 'drizzle-orm'
import { buildTaskHeight, buildTaskTitle, type TaskCard } from '../utils/tasks'

export default defineEventHandler(async (event): Promise<TaskCard[]> => {
    const query = getQuery(event)

    const conditions = []
    if (query.topic) conditions.push(eq(schema.tasks.topicId, Number(query.topic)))
    if (query.task_type) conditions.push(eq(schema.tasks.taskTypeId, Number(query.task_type)))
    if (query.difficulty) conditions.push(eq(schema.tasks.difficulty, Number(query.difficulty)))

    const rows = await db
        .select({
            id: schema.tasks.id,
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

    return rows.map((row) => ({
        id: row.id,
        title: buildTaskTitle(row.taskTypeNumber, row.examLevel, row.topicName),
        description: row.body,
        height: buildTaskHeight(row.body),
    }))
})
