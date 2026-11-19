import { asc, eq } from 'drizzle-orm'
import { buildTaskLabel } from '../../utils/tasks'

export default defineEventHandler(async (event): Promise<TaskDetail> => {
    const id = Number(getRouterParam(event, 'id'))
    if (!Number.isInteger(id)) {
        throw createError({ statusCode: 400, message: 'Некорректный идентификатор' })
    }

    const [row] = await db
        .select({
            id: schema.tasks.id,
            title: schema.tasks.title,
            body: schema.tasks.body,
            answer: schema.tasks.answer,
            answerKey: schema.tasks.answerKey,
            imageUrl: schema.tasks.imageUrl,
            taskTypeNumber: schema.taskTypes.number,
            taskTypeName: schema.taskTypes.name,
            examLevel: schema.taskTypes.examLevel,
        })
        .from(schema.tasks)
        .innerJoin(schema.taskTypes, eq(schema.tasks.taskTypeId, schema.taskTypes.id))
        .where(eq(schema.tasks.id, id))
        .limit(1)

    if (!row) throw createError({ statusCode: 404, message: 'Не найдено' })

    // Задача может входить в несколько сборников; для ссылки «назад» берём опубликованный.
    const memberships = await taskMemberships(id)
    const collectionRow = memberships.find(m => m.status === 'published') ?? memberships[0]

    // Платные ответ и решения не покидают сервер. По короткому доступу — тоже, пока решение не открыто кнопкой
    // (POST /api/tasks/:id/reveal): иначе каждое открытие страницы списывало бы лимит.
    const access = await solutionAccess(event, memberships)
    const locked = access.kind === 'locked'
    let pass: TaskPassState | null = null
    if (access.kind === 'pass') {
        const [revealed, quota] = await Promise.all([viewedRecently(access.userId, id), passQuota(access.userId, access.dailyLimit)])
        pass = { revealed, ...quota, until: access.until.toISOString(), watermark: access.email }
    }
    const showContent = access.kind === 'open' || pass?.revealed === true

    const { user } = await getUserSession(event)
    const solved = user && !locked ? (await solvedTaskIds(user.id, [id])).has(id) : false
    const content = showContent ? await loadSolutionContent(id, row.answer) : null

    const label = buildTaskLabel(row.taskTypeNumber, row.examLevel, row.taskTypeName)

    return {
        id: row.id,
        title: row.title ?? label,
        label,
        bodyHtml: renderMarkdown(row.body),
        locked,
        pass,
        checkable: !locked && Boolean(row.answerKey),
        solved,
        answerHtml: content?.answerHtml ?? null,
        solutionsHtml: content?.solutionsHtml ?? [],
        taskNumber: row.taskTypeNumber,
        taskType: row.taskTypeName,
        examLevel: row.examLevel,
        imageUrl: row.imageUrl,
        collection: collectionRow ? await collectionRef(id, collectionRow) : null,
    }
})

/** Место задачи в сборнике и её соседи по порядку. */
async function collectionRef(taskId: number, m: { collectionId: number, slug: string, title: string, position: number }): Promise<TaskCollectionRef> {
    const order = await db
        .select({ taskId: schema.collectionTasks.taskId })
        .from(schema.collectionTasks)
        .where(eq(schema.collectionTasks.collectionId, m.collectionId))
        .orderBy(asc(schema.collectionTasks.position))
    const ids = order.map(r => r.taskId)
    const index = ids.indexOf(taskId)
    return {
        slug: m.slug,
        title: m.title,
        position: m.position,
        total: ids.length,
        prevTaskId: ids[index - 1] ?? null,
        nextTaskId: index >= 0 ? ids[index + 1] ?? null : null,
    }
}
