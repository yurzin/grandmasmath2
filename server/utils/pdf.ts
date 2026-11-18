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
    const raw = async (path: string) => {
        const value = await storage.getItemRaw(key(path))
        if (value == null) return null
        if (typeof value === 'string') return new TextEncoder().encode(value)
        return value instanceof Uint8Array ? value : new Uint8Array(value as ArrayBuffer)
    }
    return {
        // Текст читаем как байты и декодируем сами: в собранном приложении getItem для .tex
        // возвращает не строку, а байты, и String() превращал их в «37,32,…».
        async text(path) {
            const bytes = await raw(path)
            return bytes == null ? null : new TextDecoder().decode(bytes)
        },
        raw,
    }
}
