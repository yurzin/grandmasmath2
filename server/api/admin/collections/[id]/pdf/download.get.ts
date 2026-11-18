import { cachedPdfInfo, readCachedPdf } from '../../../../../lib/pdf/collection-pdf'
import { watermarkPdf } from '../../../../../lib/pdf/watermark'

/**
 * Скачать собранный PDF. ?stamp=1 — с пробным водяным знаком на имя администратора
 * (посмотреть, как его увидит покупатель).
 */
export default defineAdminHandler(async (event, admin) => {
    const prepared = await preparePdfOr404(getIdParam(event))
    if (!(await cachedPdfInfo(prepared))) {
        throw createError({ statusCode: 409, message: 'PDF не собран для текущей версии сборника' })
    }

    let pdf: Uint8Array = await readCachedPdf(prepared)
    const stamp = getQuery(event).stamp === '1'
    if (stamp) {
        const font = await pdfTemplateSource().raw('fonts/DejaVuSans.ttf')
        if (!font) throw createError({ statusCode: 500, message: 'Нет шрифта для водяного знака' })
        const date = new Date().toLocaleDateString('ru-RU')
        pdf = await watermarkPdf(pdf, { text: `Образец · экземпляр для ${admin.email} · ${date}`, font, keywords: ['admin-preview'] })
    }

    const filename = `${prepared.slug}${stamp ? '-obrazets' : ''}.pdf`
    setResponseHeaders(event, {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${filename}"`,
        'cache-control': 'private, no-store',
    })
    return pdf
})
