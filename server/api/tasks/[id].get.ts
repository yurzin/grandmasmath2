import { asc, eq } from 'drizzle-orm'
import { buildTaskLabel } from '../../utils/tasks'

export default defineEventHandler(async (event): Promise<TaskDetail> => {
    const id = Number(getRouterParam(event, 'id'))
    if (!Number.isInteger(id)) {
        throw createError({ statusCode: 400, statusMessage: 'Некорректный идентификатор' })
    }

    const [row] = await db
        .select({
            id: schema.tasks.id,
            title: schema.tasks.title,
            body: schema.tasks.body,
            answer: schema.tasks.answer,
            difficulty: schema.tasks.difficulty,
            imageUrl: schema.tasks.imageUrl,
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

    const [collectionRow] = await db
        .select({
            slug: schema.collections.slug,
            title: schema.collections.title,
            position: schema.collectionTasks.position,
            isFree: schema.collectionTasks.isFree,
        })
        .from(schema.collectionTasks)
        .innerJoin(schema.collections, eq(schema.collectionTasks.collectionId, schema.collections.id))
        .where(eq(schema.collectionTasks.taskId, id))
        .limit(1)

    // Платные ответ и решения не покидают сервер.
    const locked = !(await canViewSolution(event, collectionRow))
    const solutionRows = locked
        ? []
        : await db
            .select({ body: schema.solutions.body })
            .from(schema.solutions)
            .where(eq(schema.solutions.taskId, id))
            .orderBy(asc(schema.solutions.sortOrder))

    const label = buildTaskLabel(row.taskTypeNumber, row.examLevel, row.topicName)

    return {
        id: row.id,
        title: row.title ?? label,
        label,
        bodyHtml: renderMarkdown(row.body),
        locked,
        answerHtml: locked ? null : renderMarkdownInline(row.answer),
        solutionsHtml: solutionRows.map(s => renderMarkdown(s.body)),
        difficulty: row.difficulty,
        topic: row.topicName,
        taskType: row.taskTypeName,
        examLevel: row.examLevel,
        imageUrl: row.imageUrl,
        collection: collectionRow
            ? { slug: collectionRow.slug, title: collectionRow.title, position: collectionRow.position }
            : null,
    }
})
