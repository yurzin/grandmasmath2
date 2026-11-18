import { count, eq } from 'drizzle-orm'
import { removeCachedPdfs } from '../../../lib/pdf/collection-pdf'

// Удаляется только сборник и его состав; сами задачи остаются.
// Сборник с покупками удалить нельзя — покупатели должны сохранить доступ.
export default defineAdminHandler(async (event) => {
    const id = getIdParam(event)
    const [sold] = await db.select({ n: count() }).from(schema.purchases).where(eq(schema.purchases.collectionId, id))
    if (sold && sold.n > 0) {
        throw createError({ statusCode: 409, message: 'У сборника есть покупки — удалить нельзя. Переведите его в архив.' })
    }
    const deleted = await db.delete(schema.collections).where(eq(schema.collections.id, id))
        .returning({ slug: schema.collections.slug })
    if (!deleted.length) throw createError({ statusCode: 404, message: 'Сборник не найден' })
    await removeCachedPdfs(deleted[0]!.slug)
    return { ok: true }
})
