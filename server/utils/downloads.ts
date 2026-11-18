import type { H3Event } from 'h3'
import { eq, sql } from 'drizzle-orm'
import { buildPdf, readCachedPdf } from '../lib/pdf/collection-pdf'
import { watermarkPdf } from '../lib/pdf/watermark'

/**
 * Отдаёт PDF сборника (текущей версии) с водяным знаком.
 * grant — покупка или подписка, по которой выдан доступ: её номер в водяном знаке и счётчик скачиваний.
 */
export async function sendCollectionPdf(
    event: H3Event,
    collectionId: number,
    user: { id: number, email: string },
    grant: { id: number, label: string },
) {
    // Если PDF ещё не собран — собираем (до ~30 с).
    const prepared = await preparePdfOr404(collectionId)
    await buildPdf(prepared)

    const font = await pdfTemplateSource().raw('fonts/DejaVuSans.ttf')
    if (!font) throw createError({ statusCode: 500, message: 'Нет шрифта для водяного знака' })
    const date = new Date().toLocaleDateString('ru-RU')
    const pdf = await watermarkPdf(await readCachedPdf(prepared), {
        text: `Экземпляр для ${user.email} · ${grant.label} № ${grant.id} · ${date}`,
        font,
        keywords: [`purchase-${grant.id}`, `user-${user.id}`],
    })

    await db.update(schema.purchases)
        .set({ downloadCount: sql`${schema.purchases.downloadCount} + 1` })
        .where(eq(schema.purchases.id, grant.id))

    setResponseHeaders(event, {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${prepared.slug}.pdf"`,
        'cache-control': 'private, no-store',
    })
    return pdf
}
