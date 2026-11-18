import { eq } from 'drizzle-orm'

// Удаляется только сборник и его состав; сами задачи остаются.
export default defineAdminHandler(async (event) => {
    const id = getIdParam(event)
    const deleted = await db.delete(schema.collections).where(eq(schema.collections.id, id))
        .returning({ id: schema.collections.id })
    if (!deleted.length) throw createError({ statusCode: 404, message: 'Сборник не найден' })
    return { ok: true }
})
