import { cachedPdfInfo } from '../../../../../lib/pdf/collection-pdf'

/** Состояние PDF: собран ли для текущего содержимого сборника. */
export default defineAdminHandler(async (event): Promise<AdminPdfStatus> => {
    const prepared = await preparePdfOr404(getIdParam(event))
    const cached = await cachedPdfInfo(prepared)
    return { upToDate: Boolean(cached), builtAt: cached?.builtAt ?? null, size: cached?.size ?? null, warnings: prepared.warnings }
})
