import { preparePdf, type TemplateSource } from '../lib/pdf/collection-pdf'

/** LaTeX и хеш PDF сборника; 404, если сборника нет. */
export async function preparePdfOr404(collectionId: number) {
    const prepared = await preparePdf(db, collectionId, pdfTemplateSource())
    if (!prepared) throw createError({ statusCode: 404, message: 'Сборник не найден' })
    return prepared
}

/** Шаблон PDF из server assets Nitro (nuxt.config → nitro.serverAssets 'pdf-template'). */
export function pdfTemplateSource(): TemplateSource {
    const storage = useStorage('assets:pdf-template')
    const key = (path: string) => path.replaceAll('/', ':')
    return {
        async text(path) {
            const value = await storage.getItem<string>(key(path))
            return value == null ? null : String(value)
        },
        async raw(path) {
            const value = await storage.getItemRaw(key(path))
            return value == null ? null : new Uint8Array(value as ArrayBuffer)
        },
    }
}
