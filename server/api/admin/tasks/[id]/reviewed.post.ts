import { eq, sql } from 'drizzle-orm'

/**
 * «Проверено»: снять пометку «на проверке». Текст пометки запоминается в reviewClearedNote,
 * чтобы повторный импорт сборника с тем же комментарием в исходнике не вернул её.
 */
export default defineAdminHandler(async (event) => {
    const id = getIdParam(event)
    const [row] = await db.update(schema.tasks)
        .set({ reviewClearedNote: sql`${schema.tasks.reviewNote}`, reviewNote: null })
        .where(eq(schema.tasks.id, id))
        .returning({ id: schema.tasks.id })
    if (!row) throw createError({ statusCode: 404, message: 'Задача не найдена' })
    return loadAdminTask(id)
})
