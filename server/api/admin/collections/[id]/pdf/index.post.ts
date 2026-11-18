import { buildPdf, cachedPdfInfo } from '../../../../../lib/pdf/collection-pdf'
import { LatexError } from '../../../../../lib/pdf/compile'

/** Собрать PDF (если для текущего содержимого его ещё нет). Занимает до ~30 с. */
export default defineAdminHandler(async (event): Promise<AdminPdfStatus> => {
    const prepared = await preparePdfOr404(getIdParam(event))
    try {
        await buildPdf(prepared)
    } catch (err) {
        if (err instanceof LatexError) {
            throw createError({ statusCode: 422, message: err.message, data: { log: err.log } })
        }
        throw err
    }
    const cached = await cachedPdfInfo(prepared)
    return { upToDate: true, builtAt: cached?.builtAt ?? null, size: cached?.size ?? null, warnings: prepared.warnings }
})
