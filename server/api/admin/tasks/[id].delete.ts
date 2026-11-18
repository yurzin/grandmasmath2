import { eq } from 'drizzle-orm'

// Решения, теги и места в сборниках удаляются каскадом (миграция 0003).
export default defineAdminHandler(async (event) => {
    const id = getIdParam(event)
    const deleted = await db.delete(schema.tasks).where(eq(schema.tasks.id, id)).returning({ id: schema.tasks.id })
    if (!deleted.length) throw createError({ statusCode: 404, message: 'Задача не найдена' })
    return { ok: true }
})
