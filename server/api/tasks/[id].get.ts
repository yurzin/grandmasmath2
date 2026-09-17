import { asc, eq } from 'drizzle-orm'
import { buildTaskHeight, buildTaskTitle, type TaskDetail } from '../../utils/tasks'

export default defineEventHandler(async (event): Promise<TaskDetail> => {
    const id = Number(getRouterParam(event, 'id'))
    if (!Number.isInteger(id)) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректный идентификатор' })
    }

    const [row] = await db
        .select({
            id: schema.tasks.id,
            body: schema.tasks.body,
            answer: schema.tasks.answer,
            difficulty: schema.tasks.difficulty,
            taskTypeNumber: schema.taskTypes.number,
            taskTypeName: schema.taskTypes.name,
            examLevel: schema.taskTypes.examLevel,
            topicName: schema.topics.name,
        })
        .from(schema.tasks)
        .innerJoin(schema.taskTypes, eq(schema.tasks.taskTypeId, schema.taskTypes.id))
        .leftJoin(schema.topics, eq(schema.tasks.topicId, schema.topics.id))
        .where(eq(schema.tasks.id, id))
        .limit(1)

    if (!row) throw createError({ statusCode: 404, statusMessage: 'Не найдено' })

    const solutionRows = await db
        .select({ body: schema.solutions.body })
        .from(schema.solutions)
        .where(eq(schema.solutions.taskId, id))
        .orderBy(asc(schema.solutions.sortOrder))

    return {
        id: row.id,
        title: buildTaskTitle(row.taskTypeNumber, row.examLevel, row.topicName),
        description: row.body,
        height: buildTaskHeight(row.body),
        answer: row.answer,
        difficulty: row.difficulty,
        topic: row.topicName,
        taskType: row.taskTypeName,
        examLevel: row.examLevel,
        solutions: solutionRows.map(s => s.body),
    }
})
