import { eq } from 'drizzle-orm'
import { z } from 'zod'

const bodySchema = z.object({ answer: z.string().trim().min(1, 'Введите ответ').max(255) })

// Подбор ответа перебором бессмыслен (проверять можно только открытые задачи), но частоту всё равно ограничим.
const perClient = createRateLimiter({ max: 30, windowMs: 10 * 60 * 1000 })

/** «Реши сам»: проверить ответ. Вошедшим попытка сохраняется (отметка «решено»). */
export default defineEventHandler(async (event): Promise<{ correct: boolean }> => {
    const taskId = getIdParam(event)
    const key = `${clientIp(event)}:${taskId}`
    if (perClient.isLimited(key)) throw createError({ statusCode: 429, message: 'Слишком много попыток. Сделайте паузу.' })
    perClient.hit(key)

    const { answer } = await readValidatedBody(event, validator(bodySchema))
    const [task] = await db.select({ answerKey: schema.tasks.answerKey }).from(schema.tasks)
        .where(eq(schema.tasks.id, taskId)).limit(1)
    if (!task) throw createError({ statusCode: 404, message: 'Задача не найдена' })
    if (!task.answerKey) throw createError({ statusCode: 409, message: 'Для этой задачи проверка ответа пока недоступна' })
    if (!(await taskUnlocked(event, taskId))) {
        throw createError({ statusCode: 403, message: 'Проверка доступна после покупки сборника или по подписке' })
    }

    const correct = checkAnswer(answer, task.answerKey)
    const { user } = await getUserSession(event)
    if (user) await db.insert(schema.attempts).values({ userId: user.id, taskId, answer, correct })
    return { correct }
})
