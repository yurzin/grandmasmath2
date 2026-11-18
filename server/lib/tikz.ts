// Рисунки TikZ в тексте задач хранятся в Markdown как блок ```tikz … ```.
// На сайте вместо кода показывается заранее отрисованный SVG (public/figures/<имя>.svg),
// в PDF код вставляется в LaTeX как есть. Имя файла — хеш кода, поэтому правка рисунка даёт новый файл.
import { createHash } from 'node:crypto'

export const TIKZ_FENCE = 'tikz'

/** Публичный путь к SVG рисунка. */
export function tikzFigurePath(code: string) {
    return `/figures/${tikzFigureName(code)}.svg`
}

export function tikzFigureName(code: string) {
    return createHash('sha256').update(code.trim().replace(/\r\n/g, '\n')).digest('hex').slice(0, 16)
}

/** Все рисунки TikZ из Markdown. */
export function extractTikz(markdown: string): string[] {
    return [...markdown.matchAll(/^```tikz\n([\s\S]*?)\n```$/gm)].map(m => m[1]!)
}
