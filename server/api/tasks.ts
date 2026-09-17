import { eq } from 'drizzle-orm'
import { buildTaskHeight, buildTaskTitle, type TaskCard } from '../utils/tasks'

export default defineEventHandler(async (): Promise<TaskCard[]> => {
    const rows = await db
        .select({
            id: schema.tasks.id,
            body: schema.tasks.body,
            taskTypeNumber: schema.taskTypes.number,
            examLevel: schema.taskTypes.exam_level,
            topicName: schema.topics.name,
        })
        .from(schema.tasks)
        .innerJoin(schema.taskTypes, eq(schema.tasks.task_type_id, schema.taskTypes.id))
        .leftJoin(schema.topics, eq(schema.tasks.topic_id, schema.topics.id))
        .orderBy(schema.tasks.id)

    return rows.map((row) => ({
        id: row.id,
        title: buildTaskTitle(row.taskTypeNumber, row.examLevel, row.topicName),
        description: row.body,
        height: buildTaskHeight(row.body),
    }))
})
