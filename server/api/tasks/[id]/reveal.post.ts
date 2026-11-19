import { eq } from 'drizzle-orm'

/**
 * Открыть ответ и решение по короткому доступу: засчитывается в лимит за сутки
 * (повторное открытие той же задачи в эти сутки — бесплатно). Для полного доступа просто отдаёт решение.
 */
export default defineEventHandler(async (event): Promise<TaskRevealResult> => {
    await requireUserSession(event)
    const taskId = getIdParam(event)
    const [task] = await db.select({ answer: schema.tasks.answer }).from(schema.tasks)
        .where(eq(schema.tasks.id, taskId)).limit(1)
    if (!task) throw createError({ statusCode: 404, message: 'Задача не найдена' })

    const access = await solutionAccess(event, await taskMemberships(taskId))
    if (access.kind === 'locked') {
        throw createError({ statusCode: 403, message: 'Решение доступно после покупки сборника, по подписке или короткому доступу' })
    }

    const quota = access.kind === 'pass'
        ? await registerSolutionView(access.userId, taskId, access.dailyLimit)
        : null
    return { ...(await loadSolutionContent(taskId, task.answer)), quota }
})
