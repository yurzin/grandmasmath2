import { eq, sql } from 'drizzle-orm'
import { buildPdf, readCachedPdf } from '../../../lib/pdf/collection-pdf'
import { watermarkPdf } from '../../../lib/pdf/watermark'

/** PDF купленного сборника с персональным водяным знаком. */
export default defineEventHandler(async (event) => {
    const { user, purchase } = await requireOwnPurchase(event, getIdParam(event))
    if (purchase.status !== 'succeeded') throw createError({ statusCode: 403, message: 'Покупка не оплачена' })

    // Всегда текущая версия сборника; если PDF ещё не собран — собираем (до ~30 с).
    const prepared = await preparePdfOr404(purchase.collectionId)
    await buildPdf(prepared)

    const font = await pdfTemplateSource().raw('fonts/DejaVuSans.ttf')
    if (!font) throw createError({ statusCode: 500, message: 'Нет шрифта для водяного знака' })
    const date = new Date().toLocaleDateString('ru-RU')
    const pdf = await watermarkPdf(await readCachedPdf(prepared), {
        text: `Экземпляр для ${user.email} · заказ № ${purchase.id} · ${date}`,
        font,
        keywords: [`purchase-${purchase.id}`, `user-${user.id}`],
    })

    await db.update(schema.purchases)
        .set({ downloadCount: sql`${schema.purchases.downloadCount} + 1` })
        .where(eq(schema.purchases.id, purchase.id))

    setResponseHeaders(event, {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${prepared.slug}.pdf"`,
        'cache-control': 'private, no-store',
    })
    return pdf
})
