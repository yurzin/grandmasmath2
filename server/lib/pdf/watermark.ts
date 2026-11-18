// Персональный водяной знак покупателя поверх готового PDF (без пересборки LaTeX).
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

export interface WatermarkOptions {
    /** Текст строки, например «Экземпляр для ivan@example.com · заказ 42 · 18.11.2026». */
    text: string
    /** Шрифт с кириллицей (TTF). */
    font: Uint8Array
    /** Скрытая метка в свойствах PDF (id покупки). */
    keywords?: string[]
}

export async function watermarkPdf(pdf: Uint8Array, { text, font, keywords }: WatermarkOptions) {
    const doc = await PDFDocument.load(pdf)
    doc.registerFontkit(fontkit)
    const embedded = await doc.embedFont(font, { subset: true })
    const size = 6.5

    for (const [index, page] of doc.getPages().entries()) {
        if (index === 0) continue // титульный лист не трогаем
        const { width } = page.getSize()
        const textWidth = embedded.widthOfTextAtSize(text, size)
        page.drawText(text, {
            x: (width - textWidth) / 2,
            y: 14,
            size,
            font: embedded,
            color: rgb(0.62, 0.66, 0.72),
        })
    }

    if (keywords?.length) doc.setKeywords(keywords)
    doc.setProducer('grandmasmath')
    return doc.save()
}
