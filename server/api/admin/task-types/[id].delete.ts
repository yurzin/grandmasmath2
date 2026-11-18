import { eq } from 'drizzle-orm'

export default defineAdminHandler(async (event) => {
    const id = getIdParam(event)
    assertUnused(await countTasksBy('taskTypeId', id), 'Номер ЕГЭ')
    const deleted = await db.delete(schema.taskTypes).where(eq(schema.taskTypes.id, id)).returning({ id: schema.taskTypes.id })
        .catch(err => rethrowDbError(err))
    if (!deleted.length) throw createError({ statusCode: 404, message: 'Номер ЕГЭ не найден' })
    return { ok: true }
})
