import { eq } from 'drizzle-orm'

export default defineAdminHandler(async (event) => {
    const id = getIdParam(event)
    assertUnused(await countTasksBy('topicId', id), 'Тема')
    const deleted = await db.delete(schema.topics).where(eq(schema.topics.id, id)).returning({ id: schema.topics.id })
        .catch(err => rethrowDbError(err))
    if (!deleted.length) throw createError({ statusCode: 404, message: 'Тема не найдена' })
    return { ok: true }
})
