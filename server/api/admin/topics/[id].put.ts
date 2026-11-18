import { eq } from 'drizzle-orm'

export default defineAdminHandler(async (event): Promise<AdminTopic> => {
    const id = getIdParam(event)
    const input = await readValidatedBody(event, validator(topicInputSchema))
    const [topic] = await db.update(schema.topics).set(input).where(eq(schema.topics.id, id)).returning()
        .catch(err => rethrowDbError(err, 'Тема с таким адресом (slug) уже есть'))
    if (!topic) throw createError({ statusCode: 404, message: 'Тема не найдена' })
    return { ...topic, taskCount: await countTasksBy('topicId', id) }
})
